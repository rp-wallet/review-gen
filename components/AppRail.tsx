'use client';

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
  { icon: Camera, label: 'Instagram (soon)' },
  { icon: UserRound, label: 'Profiles (soon)' },
];

export default function AppRail() {
  const pathname = usePathname();

  return (
    <nav className="app-rail" aria-label="Tools">
      <Link href="/chat-builder" className="app-rail__logo" aria-label="Home">
        <span className="app-rail__logo-mark">RP</span>
      </Link>

      <div className="app-rail__group">
        {TOOLS.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={cn('app-rail__item', active && 'is-active')}
            >
              <Icon size={20} strokeWidth={2} />
            </Link>
          );
        })}

        {SOON.map(({ icon: Icon, label }) => (
          <span
            key={label}
            title={label}
            aria-label={label}
            aria-disabled="true"
            className="app-rail__item is-disabled"
          >
            <Icon size={20} strokeWidth={2} />
          </span>
        ))}
      </div>

      <div className="app-rail__group app-rail__group--bottom">
        <span className="app-rail__credits" title="Credits">
          <Coins size={15} />
          <span className="app-rail__credits-num">∞</span>
        </span>
        <span className="app-rail__item is-disabled" title="Settings (soon)" aria-label="Settings (soon)">
          <Settings size={20} strokeWidth={2} />
        </span>
        <span className="app-rail__avatar" title="Account" aria-label="Account">
          N
        </span>
      </div>
    </nav>
  );
}
