import { NextRequest, NextResponse } from 'next/server';

type ScreenshotInput = {
  mimeType: string;
  data: string;
};

type GenerateRequest = {
  apiKey?: string;
  product?: string;
  scenario?: string;
  count?: number;
  stylePrompt?: string;
  screenshots?: ScreenshotInput[];
};

const GEMINI_MODEL = 'gemini-1.5-flash';

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
    const body = (await request.json()) as GenerateRequest;
    const apiKey = body.apiKey?.trim();

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is required.' }, { status: 400 });
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
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: 0.85,
            topP: 0.95,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json({ error: 'Gemini request failed.', detail }, { status: response.status });
    }

    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('') || '';

    if (!text) {
      return NextResponse.json({ error: 'Gemini returned an empty response.' }, { status: 502 });
    }

    const parsed = JSON.parse(cleanJson(text));
    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown generation error.' },
      { status: 500 }
    );
  }
}
