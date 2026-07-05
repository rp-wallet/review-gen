import { NextRequest, NextResponse } from 'next/server';
import { randomInt } from 'node:crypto';
import { db } from '@/db';
import { creditLedger } from '@/db/schema';
import { getEntitlement, requireCurrentSession } from '@/lib/session';
import { isTestAccount, withTestOverride } from '@/lib/test-accounts';
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

// Large requests are split into parallel Gemini calls — one 25-conversation
// response overflows the output budget and arrives as truncated (invalid) JSON.
const CHUNK_SIZE = 6;
const MAX_OUTPUT_TOKENS = 65536;

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

function normalizeStatusBarTime(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(trimmed) ? trimmed : undefined;
}

function randomStatusBarTime(used: Set<string>) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const hour = randomInt(0, 24);
    const minute = randomInt(0, 60);
    const time = `${hour}:${String(minute).padStart(2, '0')}`;
    if (!used.has(time)) return time;
  }

  return `${randomInt(0, 24)}:${String(randomInt(0, 60)).padStart(2, '0')}`;
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
    statusBarTime: normalizeStatusBarTime(value.statusBarTime),
    messages,
  };
}

// Pulls every complete object out of a (possibly truncated) `"sets": [...]`
// array with a brace scanner — salvages all finished conversations when the
// model output got cut off mid-JSON.
function extractCompleteSets(text: string): unknown[] {
  const setsIndex = text.indexOf('"sets"');
  if (setsIndex === -1) return [];
  const arrayStart = text.indexOf('[', setsIndex);
  if (arrayStart === -1) return [];

  const sets: unknown[] = [];
  let depth = 0;
  let objStart = -1;
  let inString = false;
  let escaped = false;

  for (let i = arrayStart + 1; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      if (depth === 0) objStart = i;
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0 && objStart !== -1) {
        try {
          sets.push(JSON.parse(text.slice(objStart, i + 1)));
        } catch {
          // Skip malformed fragments; keep scanning.
        }
        objStart = -1;
      }
    } else if (ch === ']' && depth === 0) {
      break;
    }
  }

  return sets;
}

type ChunkPayload = {
  sets: unknown[];
  confidence?: number;
  toneTags: string[];
  notes: string;
};

function parseChunk(text: string): ChunkPayload {
  const cleaned = cleanJson(text);
  try {
    const parsed = JSON.parse(cleaned);
    if (!isObject(parsed)) throw new Error('not an object');
    return {
      sets: Array.isArray(parsed.sets) ? parsed.sets : [],
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : undefined,
      toneTags: Array.isArray(parsed.toneTags) ? parsed.toneTags.filter((tag): tag is string => typeof tag === 'string') : [],
      notes: typeof parsed.notes === 'string' ? parsed.notes : '',
    };
  } catch {
    const salvaged = extractCompleteSets(cleaned);
    if (!salvaged.length) throw new Error('Gemini returned invalid JSON.');
    return { sets: salvaged, toneTags: [], notes: '' };
  }
}

function assembleResult(chunks: ChunkPayload[], count: number): GenerationResult {
  const sets = chunks
    .flatMap((chunk) => chunk.sets)
    .map(normalizeReviewSet)
    .filter((set): set is ReviewSet => Boolean(set))
    .slice(0, count)
    .map((set, index) => ({ ...set, id: `review-${index + 1}` }));

  if (!sets.length) throw new Error('Gemini returned no usable conversations.');

  const usedStatusTimes = new Set<string>();
  const setsWithStatusTime = sets.map((set) => {
    const statusBarTime = set.statusBarTime && !usedStatusTimes.has(set.statusBarTime)
      ? set.statusBarTime
      : randomStatusBarTime(usedStatusTimes);
    usedStatusTimes.add(statusBarTime);
    return { ...set, statusBarTime };
  });

  const confidences = chunks.map((chunk) => chunk.confidence).filter((c): c is number => typeof c === 'number');

  return {
    confidence: confidences.length
      ? Math.round(confidences.reduce((sum, c) => sum + c, 0) / confidences.length)
      : undefined,
    toneTags: Array.from(new Set(chunks.flatMap((chunk) => chunk.toneTags))),
    notes: chunks.find((chunk) => chunk.notes)?.notes ?? '',
    sets: setsWithStatusTime,
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
    const session = await requireCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 });
    }

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
    const tester = isTestAccount(session.user.email);
    const entitlement = withTestOverride(await getEntitlement(session.user.id), session.user.email);

    if (!entitlement.isPro) {
      return NextResponse.json({ error: 'upgrade_required' }, { status: 402 });
    }

    if (entitlement.credits < count) {
      return NextResponse.json({ error: 'no_credits' }, { status: 402 });
    }

    const buildPrompt = (chunkCount: number, batchIndex: number, totalBatches: number) => `You generate realistic Telegram-style review/support conversations for an internal review generator.

Return ONLY valid JSON. No markdown.

Product: ${product}
Scenario: ${scenario}
Conversation count: ${chunkCount}
Messages per conversation: ${minMessages} to ${maxMessages}
Style instructions: ${stylePrompt}
${totalBatches > 1 ? `
This is batch ${batchIndex + 1} of ${totalBatches} within one larger job generated in parallel. Choose customer names, @handles, personas, opening issues, and closing lines that other batches are unlikely to produce — anchor variety on the batch number (different first-letter ranges for names, different persona archetypes, different issue categories).
` : ''}

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
      "statusBarTime": string like "17:13",
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
- Generate exactly ${chunkCount} sets.
- Each set should have ${minMessages} to ${maxMessages} messages.
- Give every set a different random statusBarTime in 24-hour iPhone status bar format, like "9:41" or "17:13".
- Make it feel like Telegram support, not a formal testimonial.
- Customer language can be casual, typo-prone, short, and natural.
- Support should guide, resolve, and ask for feedback only when it fits.
- Do not include reply/thread references. Every message must make sense from visible prior messages only.
- The first real conversation message should establish the user's issue before support responds.
- Avoid secrets, seed phrases, private keys, real wallet addresses, or impersonation claims.
- Keep product discussion focused on ${product}.

Timing & dates:
- Message times must move strictly forward within a conversation, in 12-hour "h:mm AM/PM" format.
- Gaps should feel human: replies land seconds to a few minutes apart; a support fix can take 5-20 minutes; never a perfectly even cadence.
- If a conversation spans more than one day, change the date accordingly and keep times consistent across the boundary.
- Make each set's statusBarTime fall shortly after that conversation's last message time.

Names & identity:
- Every set gets a distinct customerName and a matching @username (e.g. "Dara K." with @darak_tt) — no name or handle repeats across sets.
- Keep the 👤 name in pinnedText identical to customerName.
- Vary customer personas across sets: nationality-flavored English, terse typers, emoji users, all-lowercase typers, occasional voice-of-frustration.

Telegram rhythm:
- Prefer several short messages in a row over one long paragraph; both sides may double- or triple-text.
- Sprinkle natural artifacts sparingly: a typo left uncorrected, a follow-up "wait nvm got it", "?" alone, lowercase starts. At most a couple per conversation.
- Emoji: light and uneven — some sets nearly none, none more than a handful total.

Ending:
- Each conversation resolves the issue and lands on a genuine-sounding positive close from the customer — a vouch, thanks, or a "legit, recommended" style line in their own voice.
- Never use canned support cliches ("Is there anything else I can help you with?", "We appreciate your patience") or AI-isms ("I hope this helps!"). Endings must differ across sets.`;

    const chunkCounts: number[] = [];
    for (let remaining = count; remaining > 0; remaining -= CHUNK_SIZE) {
      chunkCounts.push(Math.min(CHUNK_SIZE, remaining));
    }

    const callGemini = async (chunkCount: number, batchIndex: number) => {
      const parts: Array<Record<string, unknown>> = [
        { text: buildPrompt(chunkCount, batchIndex, chunkCounts.length) },
      ];
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
              maxOutputTokens: MAX_OUTPUT_TOKENS,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (!response.ok) {
        const detail = await readGeminiError(response);
        throw new Error(`Gemini request failed. ${detail}`);
      }

      const payload = await response.json();
      const text = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('') || '';

      if (!text) {
        throw new Error('Gemini returned an empty response.');
      }

      return parseChunk(text);
    };

    const chunks = await Promise.all(chunkCounts.map((chunkCount, index) => callGemini(chunkCount, index)));
    const result = assembleResult(chunks, count);

    if (!tester) {
      await db.insert(creditLedger).values({
        userId: session.user.id,
        delta: -result.sets.length,
        reason: 'generation',
        meta: {
          count: result.sets.length,
          model: GEMINI_MODEL,
          product,
        },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown generation error.' },
      { status: 500 }
    );
  }
}
