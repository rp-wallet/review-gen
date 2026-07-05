'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageSquare,
  Sparkles,
  Camera,
  UserRound,
  Settings,
  Coins,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut, useSession } from '@/lib/auth-client';

const TOOLS = [
  { href: '/chat-builder', icon: MessageSquare, label: 'Chat Builder' },
  { href: '/ai-reviews', icon: Sparkles, label: 'AI Reviews' },
];

// Surfaced but disabled — signals the roadmap without being clickable yet.
const SOON = [
  { icon: Camera, label: 'Instagram' },
  { icon: UserRound, label: 'Profiles' },
];

type MePayload = {
  isPro: boolean;
  credits: number;
};

export default function AppRail() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [me, setMe] = useState<MePayload>({ isPro: false, credits: 0 });
  const user = session?.user;
  const displayName = user?.name || user?.email || 'Guest';
  const initial = displayName.slice(0, 1).toUpperCase();

  useEffect(() => {
    let active = true;
    fetch('/api/me')
      .then((response) => response.json())
      .then((payload) => {
        if (!active) return;
        setMe({
          isPro: Boolean(payload?.isPro),
          credits: Number(payload?.credits ?? 0),
        });
      })
      .catch(() => {
        if (active) setMe({ isPro: false, credits: 0 });
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  return (
    <nav className="app-sidebar" aria-label="Tools">
      <Link href="/chat-builder" className="app-sidebar__brand" aria-label="Home">
        <span className="app-sidebar__logo-mark">
          <Image
            src="/reviewmockup-logo.png"
            alt=""
            width={36}
            height={36}
            priority
            className="app-sidebar__logo-image"
          />
        </span>
        <span className="min-w-0">
          <span className="app-sidebar__brand-name block truncate">ReviewMockup</span>
        </span>
      </Link>

      <div className="app-sidebar__group mt-6">
        {TOOLS.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn('app-sidebar__item', active && 'is-active')}
            >
              <Icon size={17} strokeWidth={2} />
              {label}
            </Link>
          );
        })}

        {SOON.map(({ icon: Icon, label }) => (
          <span
            key={label}
            title={`${label} (soon)`}
            aria-disabled="true"
            className="app-sidebar__item is-disabled"
          >
            <Icon size={17} strokeWidth={2} />
            {label}
          </span>
        ))}
      </div>

      <div className="app-sidebar__group app-sidebar__group--bottom">
        <span className="app-sidebar__item is-disabled" aria-disabled="true" title="Settings (soon)">
          <Settings size={17} strokeWidth={2} />
          Settings
        </span>
        <div className="app-sidebar__account" title="Account">
          <span className="app-sidebar__avatar">
            {user?.image ? (
              <Image src={user.image} alt="" width={32} height={32} />
            ) : (
              initial
            )}
          </span>
          <span className="min-w-0">
            <span className="app-sidebar__account-name block truncate">{displayName}</span>
            <span className="app-sidebar__account-sub">
              <Coins size={11} />
              {user ? `${me.credits} credits · ${me.isPro ? 'Pro' : 'Free'}` : 'Sign in to export'}
            </span>
          </span>
          {user && (
            <button
              type="button"
              className="app-sidebar__signout"
              aria-label="Sign out"
              title="Sign out"
              onClick={() => signOut()}
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
