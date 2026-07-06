import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { creditLedger, subscription } from '@/db/schema';
import { getCurrentSession, getEntitlement } from '@/lib/session';
import { withTestOverride } from '@/lib/test-accounts';

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 });
  }

  const userId = session.user.id;
  const entitlement = withTestOverride(await getEntitlement(userId), session.user.email);

  const [sub] = await db
    .select({
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodEnd: subscription.currentPeriodEnd,
    })
    .from(subscription)
    .where(eq(subscription.userId, userId))
    .limit(1);

  const ledger = await db
    .select({
      id: creditLedger.id,
      delta: creditLedger.delta,
      reason: creditLedger.reason,
      meta: creditLedger.meta,
      createdAt: creditLedger.createdAt,
    })
    .from(creditLedger)
    .where(eq(creditLedger.userId, userId))
    .orderBy(desc(creditLedger.createdAt))
    .limit(20);

  return NextResponse.json({
    ...entitlement,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    ledger,
  });
}
