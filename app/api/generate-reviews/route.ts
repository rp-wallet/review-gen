import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { creditLedger } from '@/db/schema';
import { getEntitlement, requireCurrentSession } from '@/lib/session';
import { isTestAccount, withTestOverride } from '@/lib/test-accounts';
import type { GenerationResult, ReviewSet } from '@/lib/types';
import { Platform, getPlatform } from '@/lib/platforms';
import {
  GEMINI_MODEL,
  ChunkPayload,
  callGeminiText,
  normalizeReviewSet,
  parseChunk,
  randomStatusBarTime,
} from '@/lib/gemini-reviews';

type ScreenshotInput = {
  mimeType: string;
  data: string;
};

type GenerateRequest = {
  platform?: string;
  product?: string;
  scenario?: string;
  count?: number;
  minMessages?: number;
  maxMessages?: number;
  stylePrompt?: string;
  screenshots?: ScreenshotInput[];
};

// Large requests are split into parallel Gemini calls — one 25-conversation
// response overflows the output budget and arrives as truncated (invalid) JSON.
const CHUNK_SIZE = 6;

function assembleResult(chunks: ChunkPayload[], count: number, platform: Platform): GenerationResult {
  const sets = chunks
    .flatMap((chunk) => chunk.sets)
    .map((set, index) => normalizeReviewSet(set, index, platform.id))
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

    const platform = getPlatform(body.platform);
    const product = body.product?.trim() || 'LarperWallet';
    const scenario = body.scenario?.trim() || 'support-resolution';
    const count = Math.max(1, Math.min(Number(body.count) || 5, 25));
    const minMessages = Math.max(15, Math.min(Number(body.minMessages) || 15, 60));
    const maxMessages = Math.max(minMessages, Math.min(Number(body.maxMessages) || Math.max(minMessages, 24), 60));
    const stylePrompt = body.stylePrompt?.trim() || platform.generation.defaultStylePrompt;
    const screenshots = (body.screenshots || []).slice(0, 8);
    const tester = isTestAccount(session.user.email);
    const entitlement = withTestOverride(await getEntitlement(session.user.id), session.user.email);

    if (!entitlement.isPro) {
      return NextResponse.json({ error: 'upgrade_required' }, { status: 402 });
    }

    if (entitlement.credits < count) {
      return NextResponse.json({ error: 'no_credits' }, { status: 402 });
    }

    const buildPrompt = (chunkCount: number, batchIndex: number, totalBatches: number) => `${platform.generation.promptIntro}

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
${platform.generation.pinnedRules ? `
${platform.generation.pinnedRules}
` : ''}
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
${platform.generation.identityRules}

${platform.label} rhythm:
${platform.generation.styleRules}

Ending:
${platform.generation.endingRules}`;

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

      return parseChunk(await callGeminiText(apiKey, parts));
    };

    const chunks = await Promise.all(chunkCounts.map((chunkCount, index) => callGemini(chunkCount, index)));
    const result = assembleResult(chunks, count, platform);

    if (!tester) {
      await db.insert(creditLedger).values({
        userId: session.user.id,
        delta: -result.sets.length,
        reason: 'generation',
        meta: {
          count: result.sets.length,
          model: GEMINI_MODEL,
          product,
          platform: platform.id,
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
