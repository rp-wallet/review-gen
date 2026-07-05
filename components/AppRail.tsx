'use client';

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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TOOLS = [
  { href: '/chat-builder', icon: MessageSquare, label: 'Chat Builder' },
  { href: '/ai-reviews', icon: Sparkles, label: 'AI Reviews' },
];

// Surfaced but disabled — signals the roadmap without being clickable yet.
const SOON = [
  { icon: Camera, label: 'Instagram' },
  { icon: UserRound, label: 'Profiles' },
];

export default function AppRail() {
  const pathname = usePathname();

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
          <span className="app-sidebar__brand-sub block truncate">
            Chat mockups in seconds
          </span>
        </span>
      </Link>

      <div className="app-sidebar__group">
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
          <span className="app-sidebar__avatar">N</span>
          <span className="min-w-0">
            <span className="app-sidebar__account-name block truncate">ReviewMockup</span>
            <span className="app-sidebar__account-sub">
              <Coins size={11} />
              ∞ credits · Pro
            </span>
          </span>
        </div>
      </div>
    </nav>
  );
}
