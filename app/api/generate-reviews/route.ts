import { NextRequest, NextResponse } from 'next/server';
import type { GenerationResult, ReviewMessage, ReviewSet } from '@/lib/types';

type ScreenshotInput = {
  mimeType: string;
  data: string;
};

type GenerateRequest = {
  product?: string;
  scenario?: string;
  count?: number;
  stylePrompt?: string;
  screenshots?: ScreenshotInput[];
};

const GEMINI_MODEL = 'gemini-2.5-flash';

const REVIEW_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    confidence: { type: 'number', minimum: 0, maximum: 100 },
    toneTags: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
    sets: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          summary: { type: 'string' },
          customerName: { type: 'string' },
          pinnedText: { type: 'string' },
          messages: {
            type: 'array',
            minItems: 6,
            maxItems: 14,
            items: {
              type: 'object',
              properties: {
                sender: { type: 'string', enum: ['customer', 'support'] },
                text: { type: 'string' },
                time: { type: 'string' },
                date: { type: 'string' },
                replyTo: { type: 'integer', minimum: 0 },
              },
              required: ['sender', 'text', 'time', 'date'],
            },
          },
        },
        required: ['id', 'title', 'summary', 'customerName', 'pinnedText', 'messages'],
      },
    },
  },
  required: ['confidence', 'toneTags', 'notes', 'sets'],
} as const;

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function textOr(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeSender(value: unknown): ReviewMessage['sender'] {
  return value === 'support' ? 'support' : 'customer';
}

function normalizeReviewSet(value: unknown, index: number): ReviewSet | null {
  if (!isObject(value)) return null;

  const rawMessages = Array.isArray(value.messages) ? value.messages : [];
  const messages = rawMessages
    .map((rawMessage): ReviewMessage | null => {
      if (!isObject(rawMessage)) return null;
      const text = textOr(rawMessage.text, '');
      if (!text) return null;

      const message: ReviewMessage = {
        sender: normalizeSender(rawMessage.sender),
        text,
        time: textOr(rawMessage.time, '03:46 PM'),
        date: textOr(rawMessage.date, 'June 25'),
      };

      if (typeof rawMessage.replyTo === 'number' && Number.isInteger(rawMessage.replyTo)) {
        message.replyTo = rawMessage.replyTo;
      }

      return message;
    })
    .filter((message): message is ReviewMessage => Boolean(message));

  if (!messages.length) return null;

  const fallbackName = `Customer ${index + 1}`;
  return {
    id: textOr(value.id, `review-${index + 1}`),
    title: textOr(value.title, `Review ${index + 1}`),
    summary: textOr(value.summary, ''),
    customerName: textOr(value.customerName, fallbackName),
    pinnedText: textOr(value.pinnedText, ''),
    messages,
  };
}

function normalizeResult(value: unknown, count: number): GenerationResult {
  if (!isObject(value)) throw new Error('Gemini returned JSON, but not the expected object.');

  const sets = (Array.isArray(value.sets) ? value.sets : [])
    .map(normalizeReviewSet)
    .filter((set): set is ReviewSet => Boolean(set))
    .slice(0, count);

  if (!sets.length) throw new Error('Gemini returned no usable conversations.');

  return {
    confidence: typeof value.confidence === 'number' ? value.confidence : undefined,
    toneTags: Array.isArray(value.toneTags) ? value.toneTags.filter((tag): tag is string => typeof tag === 'string') : [],
    notes: typeof value.notes === 'string' ? value.notes : '',
    sets,
  };
}

async function readGeminiError(response: Response) {
  const body = await response.text();
  if (!body) return response.statusText;

  try {
    const parsed = JSON.parse(body);
    if (typeof parsed?.error?.message === 'string') return parsed.error.message;
  } catch {
    // Fall through to trimmed raw body.
  }

  return body.slice(0, 500);
}

function cleanJson(text: string) {
  return text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    let body: GenerateRequest;
    try {
      body = (await request.json()) as GenerateRequest;
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Server is missing GEMINI_API_KEY. Add it to .env.local and restart.' },
        { status: 500 }
      );
    }

    const product = body.product?.trim() || 'LarperWallet';
    const scenario = body.scenario?.trim() || 'support-resolution';
    const count = Math.max(1, Math.min(Number(body.count) || 5, 25));
    const stylePrompt = body.stylePrompt?.trim() || 'Casual Telegram support review conversations.';
    const screenshots = (body.screenshots || []).slice(0, 8);

    const prompt = `You generate realistic Telegram-style review/support conversations for an internal review generator.

Return ONLY valid JSON. No markdown.

Product: ${product}
Scenario: ${scenario}
Conversation count: ${count}
Style instructions: ${stylePrompt}

Use the uploaded screenshots, if present, to infer lingo, pacing, message length, casual spelling, support tone, and review endings.

JSON schema:
{
  "confidence": number between 0 and 100,
  "toneTags": string[],
  "notes": string,
  "sets": [
    {
      "id": string,
      "title": string,
      "summary": string,
      "customerName": string,
      "pinnedText": string,
      "messages": [
        {
          "sender": "customer" | "support",
          "text": string,
          "time": string like "03:46 PM",
          "date": string like "June 25",
          "replyTo": optional number
        }
      ]
    }
  ]
}

Rules:
- Generate exactly ${count} sets.
- Each set should have 6 to 14 messages.
- Make it feel like Telegram support, not a formal testimonial.
- Customer language can be casual, typo-prone, short, and natural.
- Support should guide, resolve, and ask for feedback only when it fits.
- Avoid secrets, seed phrases, private keys, real wallet addresses, or impersonation claims.
- Keep product discussion focused on ${product}.`;

    const parts: Array<Record<string, unknown>> = [{ text: prompt }];
    for (const shot of screenshots) {
      if (!shot.mimeType || !shot.data) continue;
      parts.push({ inlineData: { mimeType: shot.mimeType, data: shot.data } });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: 0.85,
            topP: 0.95,
            maxOutputTokens: 20000,
            responseFormat: {
              text: {
                mimeType: 'application/json',
                schema: REVIEW_RESPONSE_SCHEMA,
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const detail = await readGeminiError(response);
      return NextResponse.json({ error: 'Gemini request failed.', detail }, { status: response.status });
    }

    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('') || '';

    if (!text) {
      return NextResponse.json({ error: 'Gemini returned an empty response.' }, { status: 502 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanJson(text));
    } catch {
      return NextResponse.json({ error: 'Gemini returned invalid JSON.' }, { status: 502 });
    }

    return NextResponse.json(normalizeResult(parsed, count));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown generation error.' },
      { status: 500 }
    );
  }
}
