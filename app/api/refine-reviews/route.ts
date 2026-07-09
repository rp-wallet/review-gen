import { NextRequest, NextResponse } from 'next/server';
import { getEntitlement, requireCurrentSession } from '@/lib/session';
import { withTestOverride } from '@/lib/test-accounts';
import type { ReviewSet } from '@/lib/types';
import { callGeminiText, normalizeReviewSet, parseChunk } from '@/lib/gemini-reviews';
import { getPlatform } from '@/lib/platforms';

type RefineRequest = {
  instruction?: string;
  sets?: ReviewSet[];
  product?: string;
  platform?: string;
};

// Rewriting emits roughly as much JSON as generating, so reuse the same
// parallel-chunk strategy to stay inside the output budget.
const CHUNK_SIZE = 6;
const MAX_SETS = 25;

function chunkSets(sets: ReviewSet[]): ReviewSet[][] {
  const out: ReviewSet[][] = [];
  for (let i = 0; i < sets.length; i += CHUNK_SIZE) {
    out.push(sets.slice(i, i + CHUNK_SIZE));
  }
  return out;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 });
    }

    let body: RefineRequest;
    try {
      body = (await request.json()) as RefineRequest;
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

    const instruction = body.instruction?.trim();
    if (!instruction) {
      return NextResponse.json({ error: 'An instruction is required.' }, { status: 400 });
    }

    const originals = (body.sets ?? []).slice(0, MAX_SETS);
    if (!originals.length || originals.some((set) => !set?.id || !Array.isArray(set.messages))) {
      return NextResponse.json({ error: 'At least one valid review set is required.' }, { status: 400 });
    }

    const product = body.product?.trim() || 'the product';
    const platform = getPlatform(body.platform);

    // Refining edits already-paid-for reviews, so it gates on Pro but does
    // not consume credits.
    const entitlement = withTestOverride(await getEntitlement(session.user.id), session.user.email);
    if (!entitlement.isPro) {
      return NextResponse.json({ error: 'upgrade_required' }, { status: 402 });
    }

    const buildPrompt = (chunk: ReviewSet[]) => `You revise existing ${platform.label}-style review/support conversations for an internal review generator.

Return ONLY valid JSON. No markdown.

Product: ${product}

Edit instruction from the user:
"""
${instruction}
"""

Original conversations (JSON):
${JSON.stringify({ sets: chunk })}

Task: rewrite each conversation applying the edit instruction. Return the full revised conversations in this JSON schema:
{
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
- Return exactly ${chunk.length} sets, keeping each set's "id" unchanged — this is how revisions map back to originals.
- Apply the instruction to every set, but keep each conversation's distinct voice, persona, and story unless the instruction says otherwise.
- Change only what the instruction requires; keep everything else (names, pinnedText, statusBarTime, dates, message count, pacing) as close to the original as possible.
${platform.features.pinnedMessage ? '- Keep the 👤 name in pinnedText identical to customerName.' : '- Keep pinnedText as an empty string.'}
- Message times must still move strictly forward within a conversation, in 12-hour "h:mm AM/PM" format.
- Keep it feeling like a casual ${platform.label} ${platform.conversationNoun} — no canned support cliches or AI-isms.
- Avoid secrets, seed phrases, private keys, real wallet addresses, or impersonation claims.
- Update "summary" if the story changed.`;

    const refineChunk = async (chunk: ReviewSet[]) => {
      const parsed = parseChunk(await callGeminiText(apiKey, [{ text: buildPrompt(chunk) }]));
      return parsed.sets
        .map((set, index) => normalizeReviewSet(set, index, platform.id))
        .filter((set): set is ReviewSet => Boolean(set));
    };

    const refined = (await Promise.all(chunkSets(originals).map(refineChunk))).flat();
    const refinedById = new Map(refined.map((set) => [set.id, set]));

    // Fall back to the original set when the model dropped or mangled one, and
    // never let a refine change identity fields the preview relies on.
    const sets = originals.map((original) => {
      const next = refinedById.get(original.id);
      if (!next) return original;
      return {
        ...next,
        id: original.id,
        pinnedText: next.customerName === original.customerName ? original.pinnedText : next.pinnedText,
        statusBarTime: original.statusBarTime ?? next.statusBarTime,
      };
    });

    return NextResponse.json({ sets });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown refine error.' },
      { status: 500 }
    );
  }
}
