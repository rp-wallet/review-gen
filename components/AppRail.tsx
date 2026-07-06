'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  MessageSquare,
  BotMessageSquare,
  Camera,
  UserRound,
  Settings,
  Coins,
  LogOut,
  LogIn,
  FolderDown,
  ChevronsUpDown,
  CreditCard,
  Gem,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut, useSession } from '@/lib/auth-client';
import { useAppStore } from '@/lib/store';
import AuthModal from '@/components/AuthModal';

const TOOLS = [
  { href: '/chat-builder', icon: MessageSquare, label: 'Chat Builder' },
  { href: '/ai-reviews', icon: BotMessageSquare, label: 'AI Reviews' },
  { href: '/exports', icon: FolderDown, label: 'Exports' },
];

// Surfaced but disabled — signals the roadmap without being clickable yet.
const SOON = [
  { icon: Camera, label: 'Instagram' },
  { icon: UserRound, label: 'Profiles' },
];

export default function AppRail() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const me = useAppStore((s) => s.me);
  const fetchMe = useAppStore((s) => s.fetchMe);
  const resetMe = useAppStore((s) => s.resetMe);

  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // SSR and the first client render disagree on isPending (better-auth only
  // resolves the session client-side), so both render the skeleton until
  // after hydration to keep the trees identical.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const sessionResolving = !mounted || isPending;

  const user = session?.user;
  const displayName = user?.name || user?.email || 'Guest';
  const initial = displayName.slice(0, 1).toUpperCase();

  // One fetch per signed-in user, cached in the store across route changes.
  useEffect(() => {
    fetchMe(user?.id ?? null);
  }, [fetchMe, user?.id]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    resetMe();
  };

  const openBillingPortal = async () => {
    setPortalBusy(true);
    try {
      const response = await fetch('/api/dodo/portal', { method: 'POST' });
      const payload = await response.json();
      if (response.ok && typeof payload?.url === 'string') {
        window.location.href = payload.url;
        return;
      }
    } catch {
      // Fall through to closing the menu; nothing actionable client-side.
    }
    setPortalBusy(false);
    setMenuOpen(false);
  };

  return (
    <nav className="app-sidebar" aria-label="Tools">
      <AuthModal
        open={authOpen}
        variant="export"
        onClose={() => setAuthOpen(false)}
        onComplete={() => setAuthOpen(false)}
      />

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

        {sessionResolving ? (
          // Session still resolving — placeholder shaped like the account card
          // so neither the sign-in CTA nor user details flash in.
          <div className="account-skeleton" aria-hidden="true">
            <span className="account-skeleton__avatar" />
            <span className="account-skeleton__lines">
              <span className="account-skeleton__line account-skeleton__line--name" />
              <span className="account-skeleton__line account-skeleton__line--plan" />
            </span>
          </div>
        ) : !user ? (
          <div className="account-guest">
            <button type="button" className="account-guest__cta" onClick={() => setAuthOpen(true)}>
              <LogIn size={15} />
              Sign in
            </button>
            <p className="account-guest__hint">Free to start · export &amp; save your work</p>
          </div>
        ) : (
          <div className="account" ref={menuRef}>
            {menuOpen && (
              <div className="account-menu" role="menu">
                <div className="account-menu__row account-menu__row--static">
                  <Coins size={14} />
                  <span>{me.credits} AI credits</span>
                </div>
                <div className="account-menu__sep" />
                {me.isPro ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="account-menu__row"
                    onClick={openBillingPortal}
                    disabled={portalBusy}
                  >
                    {portalBusy ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                    Manage billing
                  </button>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    className="account-menu__row account-menu__row--upgrade"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push('/pricing');
                    }}
                  >
                    <Gem size={14} />
                    Upgrade to Pro
                  </button>
                )}
                <Link
                  href="/exports"
                  role="menuitem"
                  className="account-menu__row"
                  onClick={() => setMenuOpen(false)}
                >
                  <FolderDown size={14} />
                  My exports
                </Link>
                <div className="account-menu__sep" />
                <button type="button" role="menuitem" className="account-menu__row" onClick={handleSignOut}>
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            )}

            <button
              type="button"
              className="account-card"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="account-card__avatar">
                {user.image ? <Image src={user.image} alt="" width={34} height={34} /> : initial}
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="account-card__name block truncate">{displayName}</span>
                <span className={cn('account-card__plan', me.isPro && 'is-pro')}>
                  {me.isPro ? 'Pro Plan' : 'Free Plan'}
                </span>
              </span>
              <ChevronsUpDown size={14} className="account-card__chevron" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
