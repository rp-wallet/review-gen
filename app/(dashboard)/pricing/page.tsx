'use client';

import { useState } from 'react';
import {
  Check,
  Gem,
  Loader2,
  CreditCard,
  Droplets,
} from 'lucide-react';
import WorkspaceHeader from '@/components/WorkspaceHeader';
import AuthModal from '@/components/AuthModal';
import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/auth-client';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

type Interval = 'month' | 'year';

const FREE_FEATURES = [
  'Unlimited chat building',
  'All iPhone devices & frames',
  'Watermarked PNG exports',
  'Export history',
];

const PRO_FEATURES = [
  'Clean exports — no watermark',
  '100 AI review credits / month',
  'Bulk ZIP download',
  'Priority rendering',
  'Instagram & X mockups (soon)',
];

export default function PricingPage() {
  const { data: session } = useSession();
  const me = useAppStore((s) => s.me);
  const [interval, setInterval] = useState<Interval>('year');
  const [busy, setBusy] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [error, setError] = useState('');

  const startCheckout = async () => {
    if (!session?.user) {
      setAuthOpen(true);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await fetch(
        `/api/dodo/checkout?interval=${interval}&returnTo=${encodeURIComponent('/pricing')}`,
        { method: 'POST' }
      );
      const payload = await response.json();
      if (!response.ok || typeof payload?.url !== 'string') {
        throw new Error(payload?.error || 'Unable to start checkout.');
      }
      window.location.href = payload.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start checkout.');
      setBusy(false);
    }
  };

  const openPortal = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/dodo/portal', { method: 'POST' });
      const payload = await response.json();
      if (response.ok && typeof payload?.url === 'string') {
        window.location.href = payload.url;
        return;
      }
    } catch {
      // Nothing actionable client-side.
    }
    setBusy(false);
  };

  return (
    <div className="workspace">
      <AuthModal
        open={authOpen}
        variant="export"
        onClose={() => setAuthOpen(false)}
        onComplete={() => setAuthOpen(false)}
      />
      <WorkspaceHeader title="Pricing" subtitle="Simple plans — upgrade when you need clean exports" />

      <div className="pricing">
        <div className="pricing__toggle" role="group" aria-label="Billing period">
          <button
            type="button"
            className={cn('pricing__toggle-opt', interval === 'month' && 'is-active')}
            onClick={() => setInterval('month')}
          >
            Monthly
          </button>
          <button
            type="button"
            className={cn('pricing__toggle-opt', interval === 'year' && 'is-active')}
            onClick={() => setInterval('year')}
          >
            Annual
            <span className="pricing__save">save 20%</span>
          </button>
        </div>

        <div className="pricing__grid">
          {/* ── Free ─────────────────────────────────────────────── */}
          <section className="pricing-card">
            <div className="pricing-card__head">
              <span className="pricing-card__icon"><Droplets size={15} /></span>
              <h2>Free</h2>
            </div>
            <p className="pricing-card__price">
              $0<span>/month</span>
            </p>
            <p className="pricing-card__blurb">Build and share mockups with a small watermark.</p>
            <ul className="pricing-card__list">
              {FREE_FEATURES.map((feature) => (
                <li key={feature}><Check size={14} />{feature}</li>
              ))}
            </ul>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              disabled={Boolean(session?.user)}
              onClick={() => setAuthOpen(true)}
            >
              {session?.user ? 'Your current plan' : 'Start free'}
            </Button>
          </section>

          {/* ── Pro ──────────────────────────────────────────────── */}
          <section className="pricing-card pricing-card--pro">
            <div className="pricing-card__head">
              <span className="pricing-card__icon pricing-card__icon--pro"><Gem size={15} /></span>
              <h2>Pro</h2>
              <span className="pricing-card__badge">Most popular</span>
            </div>
            <p className="pricing-card__price">
              ${interval === 'year' ? 15 : 19}<span>/month</span>
            </p>
            <p className="pricing-card__blurb">
              {interval === 'year' ? 'Billed annually at $180/year.' : 'Billed monthly. Switch to annual to save 20%.'}
            </p>
            <ul className="pricing-card__list">
              {PRO_FEATURES.map((feature) => (
                <li key={feature}><Check size={14} />{feature}</li>
              ))}
            </ul>
            {me.isPro ? (
              <Button variant="outline" size="lg" className="w-full" onClick={openPortal} disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <CreditCard />}
                Manage billing
              </Button>
            ) : (
              <Button variant="brand" size="lg" className="w-full" onClick={startCheckout} disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <Gem />}
                Upgrade to Pro
              </Button>
            )}
            {error && <p className="pricing-card__error">{error}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
