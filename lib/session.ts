import { and, count, desc, eq, gt, gte, inArray, sql } from 'drizzle-orm';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { creditLedger, exportLog, subscription } from '@/db/schema';

const PRO_STATUSES = ['active'] as const;

export async function getCurrentSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireCurrentSession() {
  const session = await getCurrentSession();
  if (!session) return null;
  return session;
}

export async function getEntitlement(userId: string) {
  const [sub] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.userId, userId))
    .orderBy(desc(subscription.updatedAt))
    .limit(1);

  const now = new Date();
  const isPro =
    sub?.plan === 'pro' &&
    PRO_STATUSES.includes(sub.status as (typeof PRO_STATUSES)[number]) &&
    (!sub.currentPeriodEnd || sub.currentPeriodEnd > now);

  const [balance] = await db
    .select({ value: sql<number>`coalesce(sum(${creditLedger.delta}), 0)` })
    .from(creditLedger)
    .where(eq(creditLedger.userId, userId));

  return {
    plan: isPro ? 'pro' : 'free',
    subscriptionStatus: sub?.status ?? null,
    isPro,
    credits: Number(balance?.value ?? 0),
    currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
  };
}

export async function countRecentExports(userId: string, since: Date) {
  const [row] = await db
    .select({ count: count() })
    .from(exportLog)
    .where(and(eq(exportLog.userId, userId), gte(exportLog.createdAt, since)));

  return row?.count ?? 0;
}

export async function hasActiveProSubscription(userId: string) {
  const rows = await db
    .select({ id: subscription.id })
    .from(subscription)
    .where(
      and(
        eq(subscription.userId, userId),
        eq(subscription.plan, 'pro'),
        inArray(subscription.status, [...PRO_STATUSES]),
        gt(subscription.currentPeriodEnd, new Date())
      )
    )
    .limit(1);

  return rows.length > 0;
}
