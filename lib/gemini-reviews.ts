import { randomInt } from 'node:crypto';
import type { ReviewMessage, ReviewSet } from '@/lib/types';

export const GEMINI_MODEL = 'gemini-2.5-flash';
export const MAX_OUTPUT_TOKENS = 65536;

type JsonObject = Record<string, unknown>;

export function isObject(value: unknown): value is JsonObject {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function textOr(value: unknown, fallback: string) {
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

export function normalizeStatusBarTime(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(trimmed) ? trimmed : undefined;
}

export function randomStatusBarTime(used: Set<string>) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const hour = randomInt(0, 24);
    const minute = randomInt(0, 60);
    const time = `${hour}:${String(minute).padStart(2, '0')}`;
    if (!used.has(time)) return time;
  }

  return `${randomInt(0, 24)}:${String(randomInt(0, 60)).padStart(2, '0')}`;
}

export function normalizeReviewSet(value: unknown, index: number): ReviewSet | null {
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

export type ChunkPayload = {
  sets: unknown[];
  confidence?: number;
  toneTags: string[];
  notes: string;
};

export function parseChunk(text: string): ChunkPayload {
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

/** One Gemini generateContent call returning the concatenated text response. */
export async function callGeminiText(apiKey: string, parts: Array<Record<string, unknown>>) {
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

  return text;
}
