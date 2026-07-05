import { NextResponse } from 'next/server';
import { getCurrentSession, getEntitlement } from '@/lib/session';

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({
      user: null,
      plan: 'free',
      isPro: false,
      credits: 0,
      subscriptionStatus: null,
      currentPeriodEnd: null,
    });
  }

  const entitlement = await getEntitlement(session.user.id);

  return NextResponse.json({
    user: session.user,
    ...entitlement,
  });
}
