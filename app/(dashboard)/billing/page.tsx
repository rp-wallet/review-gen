'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Coins,
  Gem,
  LogIn,
  Loader2,
  ExternalLink,
  ReceiptText,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from '@/lib/auth-client';
import { useAppStore } from '@/lib/store';
import WorkspaceHeader from '@/components/WorkspaceHeader';
import AuthModal from '@/components/AuthModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

type LedgerRow = {
  id: string;
  delta: number;
  reason: string;
  meta: { count?: number } | null;
  createdAt: string;
};

type BillingData = {
  plan: 'free' | 'pro';
  isPro: boolean;
  credits: number;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  ledger: LedgerRow[];
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function ledgerLabel(row: LedgerRow) {
  if (row.reason === 'monthly_grant') return 'Credit grant';
  if (row.reason === 'generation') {
    const n = row.meta?.count;
    return n ? `Generated ${n} review${n === 1 ? '' : 's'}` : 'Review generation';
  }
  return row.reason.replace(/_/g, ' ');
}

function statusChip(data: BillingData) {
  if (!data.isPro) return { label: 'Free', tone: 'muted' as const };
  if (data.cancelAtPeriodEnd) return { label: 'Cancels soon', tone: 'warn' as const };
  if (data.subscriptionStatus === 'on_hold') return { label: 'On hold', tone: 'warn' as const };
  return { label: 'Active', tone: 'ok' as const };
}

export default function BillingPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const user = session?.user;

  const [authOpen, setAuthOpen] = useState(false);
  const [data, setData] = useState<BillingData | null>(null);
  const [failed, setFailed] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);
  const fetchMe = useAppStore((s) => s.fetchMe);

  useEffect(() => {
    fetchMe(user?.id ?? null);
  }, [fetchMe, user?.id]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch('/api/billing')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('billing_failed'))))
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Loading is derived, not stored: signed in, nothing fetched yet.
  const loading = !!user && !data && !failed;

  const openPortal = async () => {
    setPortalBusy(true);
    try {
      const response = await fetch('/api/dodo/portal', { method: 'POST' });
      const payload = await response.json();
      if (response.ok && typeof payload?.url === 'string') {
        window.location.href = payload.url;
        return;
      }
    } catch {
      // Button re-enables; nothing actionable client-side.
    }
    setPortalBusy(false);
  };

  const renewal = formatDate(data?.currentPeriodEnd ?? null);
  const chip = data ? statusChip(data) : null;

  return (
    <div className="workspace">
      <AuthModal
        open={authOpen}
        variant="export"
        onClose={() => setAuthOpen(false)}
        onComplete={() => setAuthOpen(false)}
      />
      <WorkspaceHeader title="Billing" subtitle="Plan, credits and activity" showPreviewControls={false} />

      {!user && !isPending ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-12 py-14 text-center">
            <CreditCard size={24} className="text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Sign in to manage billing</p>
              <p className="text-[13px] text-muted-foreground">Your plan and credit activity live here.</p>
            </div>
            <Button variant="brand" size="sm" onClick={() => setAuthOpen(true)}>
              <LogIn size={14} />
              Sign in
            </Button>
          </div>
        </div>
      ) : loading || isPending ? (
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 py-6">
          {[112, 96, 220].map((h, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-border bg-muted/30" style={{ height: h }} />
          ))}
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 overflow-y-auto py-6">
          {/* ── Plan ─────────────────────────────────────────────── */}
          <Card>
            <CardContent className="flex flex-col gap-5 p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
                    Current plan
                  </span>
                  <span className="text-xl font-semibold tracking-tight text-foreground">
                    {data?.isPro ? 'Pro' : 'Free'}
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    {data?.isPro
                      ? data.cancelAtPeriodEnd
                        ? renewal
                          ? `Access until ${renewal}`
                          : 'Access until the end of the period'
                        : renewal
                          ? `Renews ${renewal}`
                          : 'Active subscription'
                      : 'Watermarked exports · no AI generation'}
                  </span>
                </div>
                {chip && (
                  <span
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[11.5px] font-medium',
                      chip.tone === 'ok' && 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400',
                      chip.tone === 'warn' && 'border-amber-500/25 bg-amber-500/10 text-amber-400',
                      chip.tone === 'muted' && 'border-border bg-muted/40 text-muted-foreground'
                    )}
                  >
                    {chip.label}
                  </span>
                )}
              </div>
              {data?.isPro ? (
                <Button variant="outline" onClick={openPortal} disabled={portalBusy} className="self-start">
                  {portalBusy ? <Loader2 className="animate-spin" /> : <ExternalLink size={14} />}
                  Customer portal
                </Button>
              ) : (
                <Button variant="brand" onClick={() => router.push('/pricing')} className="self-start">
                  <Gem size={14} />
                  Upgrade to Pro
                </Button>
              )}
              {data?.isPro && (
                <p className="-mt-2 text-[12px] text-muted-foreground">
                  Invoices, payment method and cancellation are handled in the secure portal.
                </p>
              )}
            </CardContent>
          </Card>

          {/* ── Credits ──────────────────────────────────────────── */}
          <Card>
            <CardContent className="flex items-center justify-between gap-4 p-6">
              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
                  AI credits
                </span>
                <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                  {data?.credits ?? 0}
                </span>
                <span className="text-[13px] text-muted-foreground">
                  1 credit = 1 generated review · refills each billing cycle on Pro
                </span>
              </div>
              <span className="flex size-11 items-center justify-center rounded-full border border-border bg-muted/30 text-muted-foreground">
                <Coins size={18} />
              </span>
            </CardContent>
          </Card>

          {/* ── Activity ─────────────────────────────────────────── */}
          <Card>
            <CardContent className="flex flex-col p-6 pb-2">
              <div className="flex items-center gap-2 pb-2">
                <ReceiptText size={14} className="text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Credit activity</span>
                {data?.ledger?.length ? <Badge variant="muted">{data.ledger.length}</Badge> : null}
              </div>
              {!data?.ledger?.length ? (
                <p className="pb-4 text-[13px] text-muted-foreground">
                  No activity yet — credits appear here once you subscribe or generate reviews.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.ledger.map((row) => (
                    <li key={row.id} className="flex items-center justify-between gap-3 py-3">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted/30 text-muted-foreground">
                          {row.delta > 0 ? <Sparkles size={13} /> : <Wand2 size={13} />}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] text-foreground">{ledgerLabel(row)}</span>
                          <span className="block text-[11.5px] text-muted-foreground">
                            {formatDate(row.createdAt)}
                          </span>
                        </span>
                      </span>
                      <span
                        className={cn(
                          'text-[13px] font-medium tabular-nums',
                          row.delta > 0 ? 'text-emerald-400' : 'text-muted-foreground'
                        )}
                      >
                        {row.delta > 0 ? `+${row.delta}` : row.delta}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
