'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UserRound,
  CreditCard,
  Coins,
  Gem,
  LogOut,
  LogIn,
  Loader2,
  Check,
  ChevronRight,
  FolderDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut, updateUser, useSession } from '@/lib/auth-client';
import { useAppStore } from '@/lib/store';
import WorkspaceHeader from '@/components/WorkspaceHeader';
import AuthModal from '@/components/AuthModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function SettingsRow({
  href,
  icon,
  label,
  value,
  tone,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value?: React.ReactNode;
  tone?: 'brand';
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 py-3 transition-colors first:pt-0 last:pb-0"
    >
      <span className="flex items-center gap-3">
        <span
          className={cn(
            'flex size-8 items-center justify-center rounded-lg border border-border bg-muted/30',
            tone === 'brand' ? 'text-[#b3a5f2]' : 'text-muted-foreground'
          )}
        >
          {icon}
        </span>
        <span className="text-[13.5px] font-medium text-foreground">{label}</span>
      </span>
      <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
        {value}
        <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const me = useAppStore((s) => s.me);
  const fetchMe = useAppStore((s) => s.fetchMe);
  const resetMe = useAppStore((s) => s.resetMe);

  const user = session?.user;

  const [authOpen, setAuthOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    fetchMe(user?.id ?? null);
  }, [fetchMe, user?.id]);

  // Seed the name field when the session (or an external update) changes the
  // stored name — adjust-during-render instead of an effect.
  const [seededName, setSeededName] = useState<string | null>(null);
  if ((user?.name ?? '') !== seededName) {
    setSeededName(user?.name ?? '');
    setName(user?.name ?? '');
  }

  const saveName = async () => {
    const next = name.trim();
    if (!next || next === user?.name) return;
    setSaving(true);
    setSaveError('');
    try {
      const { error } = await updateUser({ name: next });
      if (error) throw new Error(error.message || 'Could not save.');
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    resetMe();
    router.push('/chat-builder');
  };

  return (
    <div className="workspace">
      <AuthModal
        open={authOpen}
        variant="export"
        onClose={() => setAuthOpen(false)}
        onComplete={() => setAuthOpen(false)}
      />
      <WorkspaceHeader title="Settings" subtitle="Account and preferences" showPreviewControls={false} />

      {!user && !isPending ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-12 py-14 text-center">
            <UserRound size={24} className="text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Sign in to manage your account</p>
              <p className="text-[13px] text-muted-foreground">Profile, plan and billing live here.</p>
            </div>
            <Button variant="brand" size="sm" onClick={() => setAuthOpen(true)}>
              <LogIn size={14} />
              Sign in
            </Button>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 overflow-y-auto py-6">
          {/* ── Profile ──────────────────────────────────────────── */}
          <Card>
            <CardContent className="flex flex-col gap-5 p-6">
              <div className="flex items-center gap-3.5">
                <span className="flex size-12 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#8774e1] to-[#5f4dc0] text-[15px] font-semibold text-white">
                  {user?.image ? (
                    <Image src={user.image} alt="" width={48} height={48} />
                  ) : (
                    (user?.name || user?.email || '?').slice(0, 1).toUpperCase()
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold tracking-tight text-foreground">
                    {user?.name || 'No name yet'}
                  </p>
                  <p className="truncate text-[12.5px] text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="settings-name">Display name</Label>
                <div className="flex gap-2">
                  <Input
                    id="settings-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    disabled={isPending || saving}
                  />
                  <Button
                    variant="outline"
                    onClick={saveName}
                    disabled={saving || !name.trim() || name.trim() === user?.name}
                  >
                    {saving ? <Loader2 className="animate-spin" /> : saved ? <Check /> : null}
                    {saved ? 'Saved' : 'Save'}
                  </Button>
                </div>
                {saveError && <p className="text-[12px] text-destructive">{saveError}</p>}
              </div>
            </CardContent>
          </Card>

          {/* ── Plan / billing / exports rows ────────────────────── */}
          <Card>
            <CardContent className="flex flex-col divide-y divide-border p-6 py-5">
              <SettingsRow
                href="/billing"
                icon={<Gem size={14} />}
                tone={me.isPro ? 'brand' : undefined}
                label="Plan"
                value={me.isPro ? 'Pro' : 'Free'}
              />
              <SettingsRow
                href="/billing"
                icon={<Coins size={14} />}
                label="AI credits"
                value={String(me.credits)}
              />
              <SettingsRow
                href="/billing"
                icon={<CreditCard size={14} />}
                label="Billing"
                value={me.isPro ? 'Manage' : 'Upgrade'}
              />
              <SettingsRow
                href="/exports"
                icon={<FolderDown size={14} />}
                label="My exports"
              />
            </CardContent>
          </Card>

          {/* ── Session ──────────────────────────────────────────── */}
          <Card>
            <CardContent className="flex items-center justify-between gap-3 p-6 py-5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[13.5px] font-medium text-foreground">Session</span>
                <span className="text-[12px] text-muted-foreground">Signed in as {user?.email}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut} disabled={isPending}>
                <LogOut size={14} />
                Sign out
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
