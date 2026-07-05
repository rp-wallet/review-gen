import { NextRequest, NextResponse } from 'next/server';
import { randomInt } from 'node:crypto';
import type { GenerationResult, ReviewMessage, ReviewSet } from '@/lib/types';

type ScreenshotInput = {
  mimeType: string;
  data: string;
};

type GenerateRequest = {
  product?: string;
  scenario?: string;
  count?: number;
  minMessages?: number;
  maxMessages?: number;
  stylePrompt?: string;
  screenshots?: ScreenshotInput[];
};

const GEMINI_MODEL = 'gemini-2.5-flash';

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

function randomProfileId() {
  return Array.from({ length: 10 }, () => randomInt(0, 10)).join('');
}

function normalizePinnedText(value: unknown, customerName: string) {
  const text = textOr(value, `🆔 0000000000 🤑 @customer 👤 ${customerName} ✅ Telegram Premium User 🌐 Language: en`);
  const id = randomProfileId();

  if (/🆔\s*\d+/u.test(text)) return text.replace(/(🆔\s*)\d+/u, `$1${id}`);
  return `🆔 ${id} ${text}`;
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

      return message;
    })
    .filter((message): message is ReviewMessage => Boolean(message));

  if (!messages.length) return null;

  const fallbackName = `Customer ${index + 1}`;
  const customerName = textOr(value.customerName, fallbackName);
  return {
    id: textOr(value.id, `review-${index + 1}`),
    title: textOr(value.title, `Review ${index + 1}`),
    summary: textOr(value.summary, ''),
    customerName,
    pinnedText: normalizePinnedText(value.pinnedText, customerName),
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
    const minMessages = Math.max(15, Math.min(Number(body.minMessages) || 15, 60));
    const maxMessages = Math.max(minMessages, Math.min(Number(body.maxMessages) || Math.max(minMessages, 24), 60));
    const stylePrompt = body.stylePrompt?.trim() || 'Casual Telegram support review conversations.';
    const screenshots = (body.screenshots || []).slice(0, 8);

    const prompt = `You generate realistic Telegram-style review/support conversations for an internal review generator.

Return ONLY valid JSON. No markdown.

Product: ${product}
Scenario: ${scenario}
Conversation count: ${count}
Messages per conversation: ${minMessages} to ${maxMessages}
Style instructions: ${stylePrompt}

Use the uploaded screenshots, if present, to infer lingo, pacing, message length, casual spelling, support tone, and review endings.

The pinnedText is also rendered as the first rich profile message in the chat. Keep it profile-style and reusable in both places, for example: "🆔 1359404829 🤑 @customer_name 👤 Customer Name ✅ Telegram Premium User 🌐 Language: en". Use a random 10-digit ID, where each digit may be any value 0-9. Never use ascending or descending IDs like 0123456789 or 9876543210.

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
          "date": string like "June 25"
        }
      ]
    }
  ]
}

Rules:
- Generate exactly ${count} sets.
- Each set should have ${minMessages} to ${maxMessages} messages.
- Make it feel like Telegram support, not a formal testimonial.
- Customer language can be casual, typo-prone, short, and natural.
- Support should guide, resolve, and ask for feedback only when it fits.
- Do not include reply/thread references. Every message must make sense from visible prior messages only.
- The first real conversation message should establish the user's issue before support responds.
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
            responseMimeType: 'application/json',
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
