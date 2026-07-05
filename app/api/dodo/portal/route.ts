import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { subscription } from '@/db/schema';
import { getAppUrl, getDodoClient } from '@/lib/dodo';
import { requireCurrentSession } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const session = await requireCurrentSession();

  if (!session) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 });
  }

  const [sub] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.userId, session.user.id))
    .limit(1);

  if (!sub?.dodoCustomerId) {
    return NextResponse.json({ error: 'customer_not_found' }, { status: 404 });
  }

  try {
    const portal = await getDodoClient().customers.customerPortal.create(sub.dodoCustomerId, {
      return_url: `${getAppUrl(request.url)}/ai-reviews`,
    });

    return NextResponse.json({ url: portal.link });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to create Dodo portal session.' },
      { status: 500 }
    );
  }
}
