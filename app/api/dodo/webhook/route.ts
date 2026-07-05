import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import type { WebhookPayload } from 'dodopayments/resources/webhook-events';
import { db } from '@/db';
import { creditLedger, subscription } from '@/db/schema';
import { getDodoClient, getProProductIds } from '@/lib/dodo';

export const runtime = 'nodejs';

const MONTHLY_PRO_CREDITS = Number(process.env.PRO_MONTHLY_CREDITS || 100);

function asWebhookPayload(value: unknown): WebhookPayload {
  return value as WebhookPayload;
}

function toDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function findUserId(event: WebhookPayload) {
  const data = event.data;
  const metadata = 'metadata' in data ? data.metadata : undefined;
  const fromMetadata = metadata && typeof metadata.userId === 'string' ? metadata.userId : null;
  if (fromMetadata) return fromMetadata;

  if ('subscription_id' in data && typeof data.subscription_id === 'string') {
    const [existing] = await db
      .select({ userId: subscription.userId })
      .from(subscription)
      .where(eq(subscription.dodoSubscriptionId, data.subscription_id))
      .limit(1);
    return existing?.userId ?? null;
  }

  return null;
}

async function upsertSubscription(event: WebhookPayload) {
  if (event.data.payload_type !== 'Subscription') return;

  const userId = await findUserId(event);
  if (!userId) return;

  const isProProduct = getProProductIds().includes(event.data.product_id);
  const values = {
    userId,
    plan: isProProduct ? 'pro' as const : 'free' as const,
    status: event.data.status,
    dodoCustomerId: event.data.customer.customer_id,
    dodoSubscriptionId: event.data.subscription_id,
    dodoProductId: event.data.product_id,
    currentPeriodEnd: toDate(event.data.next_billing_date),
    cancelAtPeriodEnd: event.data.cancel_at_next_billing_date,
    updatedAt: new Date(),
  };

  await db
    .insert(subscription)
    .values(values)
    .onConflictDoUpdate({
      target: subscription.userId,
      set: values,
    });

  if (event.type === 'subscription.active' || event.type === 'subscription.renewed') {
    await db.insert(creditLedger).values({
      userId,
      delta: MONTHLY_PRO_CREDITS,
      reason: 'monthly_grant',
      meta: {
        source: 'dodo',
        eventType: event.type,
        subscriptionId: event.data.subscription_id,
      },
    });
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  try {
    const headerRecord = Object.fromEntries(request.headers.entries());
    const event = asWebhookPayload(
      getDodoClient().webhooks.unwrap(rawBody, { headers: headerRecord })
    );

    if (
      event.type === 'subscription.active' ||
      event.type === 'subscription.renewed' ||
      event.type === 'subscription.updated' ||
      event.type === 'subscription.plan_changed' ||
      event.type === 'subscription.cancelled' ||
      event.type === 'subscription.failed' ||
      event.type === 'subscription.expired' ||
      event.type === 'subscription.on_hold'
    ) {
      await upsertSubscription(event);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid Dodo webhook.' },
      { status: 400 }
    );
  }
}
