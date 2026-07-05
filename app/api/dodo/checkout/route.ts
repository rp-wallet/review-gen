import { NextRequest, NextResponse } from 'next/server';
import { getAppUrl, getDodoClient, getProProductId } from '@/lib/dodo';
import { requireCurrentSession } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const session = await requireCurrentSession();

  if (!session) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 });
  }

  try {
    const origin = getAppUrl(request.url);
    const productId = getProProductId();
    const dodo = getDodoClient();
    const returnUrl = `${origin}${new URL(request.url).searchParams.get('returnTo') || '/ai-reviews'}?upgraded=1`;

    const checkout = await dodo.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: {
        email: session.user.email,
        name: session.user.name || session.user.email,
      },
      metadata: {
        userId: session.user.id,
        plan: 'pro',
      },
      return_url: returnUrl,
      cancel_url: `${origin}/ai-reviews`,
    });

    if (!checkout.checkout_url) {
      return NextResponse.json({ error: 'checkout_url_missing' }, { status: 502 });
    }

    return NextResponse.json({ url: checkout.checkout_url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to create Dodo checkout.' },
      { status: 500 }
    );
  }
}
