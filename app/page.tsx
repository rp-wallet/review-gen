import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  MessageSquare,
  BotMessageSquare,
  Smartphone,
  FolderArchive,
  Check,
  ArrowRight,
  Wand2,
  PencilLine,
  Download,
} from 'lucide-react';
import Header from '@/components/Header';
import PinnedMessage from '@/components/PinnedMessage';
import MessageBubble from '@/components/MessageBubble';
import MessageInput from '@/components/MessageInput';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'ReviewMockup — Telegram chat screenshots that look real',
  description:
    'Build pixel-perfect Telegram review conversations, generate them with AI, and export retina iPhone screenshots in seconds.',
};

const FEATURES = [
  {
    icon: MessageSquare,
    title: 'Chat Builder',
    body: 'Compose every message by hand — names, times, dates, pinned profiles, read receipts. Drag to reorder, edit inline.',
  },
  {
    icon: BotMessageSquare,
    title: 'AI Reviews',
    body: 'Describe your product and get complete, human-sounding support conversations. Refine one review or all of them with a prompt.',
  },
  {
    icon: Smartphone,
    title: 'Pixel-exact devices',
    body: 'Seven iPhone frames with true logical resolutions, liquid-glass bars and real Telegram type metrics. Exports at @3x.',
  },
  {
    icon: FolderArchive,
    title: 'Bulk export',
    body: 'Render a whole batch to PNG and download everything as one ZIP. Every export is logged and reopenable.',
  },
];

const STEPS = [
  {
    icon: Wand2,
    title: 'Generate or build',
    body: 'Let AI draft full conversations from a product description, or start from a blank chat.',
  },
  {
    icon: PencilLine,
    title: 'Polish the details',
    body: 'Tweak messages, dates, avatars and the pinned profile until it reads exactly right.',
  },
  {
    icon: Download,
    title: 'Export retina PNGs',
    body: 'One screenshot or a ZIP of the whole batch — rendered server-side, pixel-identical to the preview.',
  },
];

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
];

// Static showcase conversation for the hero phone.
const HERO_MESSAGES = [
  { text: 'yo quick question, is the promo still running?', time: '11:08 PM', out: false, first: true, last: true },
  { text: 'It is — applied automatically at checkout until Sunday.', time: '11:09 PM', out: true, first: true, last: true },
  { text: 'done. that was way easier than expected', time: '11:12 PM', out: false, first: true, last: false },
  { text: 'legit app, recommended 💯', time: '11:12 PM', out: false, first: false, last: true },
  { text: 'Appreciate it! Enjoy the upgrade.', time: '11:13 PM', out: true, first: true, last: true },
];

export default function LandingPage() {
  return (
    <div className="h-dvh overflow-y-auto overflow-x-hidden bg-[#0b0b0f] text-foreground">
      {/* ── Nav ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 px-4 pt-4">
        <nav className="liquid-glass mx-auto flex h-14 w-full max-w-5xl items-center justify-between rounded-2xl px-4">
          <Link href="/" className="relative z-[1] flex items-center gap-2.5">
            <Image src="/reviewmockup-logo.png" alt="" width={28} height={28} className="rounded-lg" />
            <span className="text-[15px] font-semibold tracking-tight text-white">ReviewMockup</span>
          </Link>
          <div className="relative z-[1] hidden items-center gap-6 text-[13.5px] text-muted-foreground sm:flex">
            <a href="#features" className="transition-colors hover:text-white">Features</a>
            <a href="#how" className="transition-colors hover:text-white">How it works</a>
            <a href="#pricing" className="transition-colors hover:text-white">Pricing</a>
          </div>
          <Button asChild variant="brand" size="sm" className="relative z-[1]">
            <Link href="/chat-builder">
              Open app
              <ArrowRight size={14} />
            </Link>
          </Button>
        </nav>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative mx-auto grid w-full max-w-5xl items-center gap-14 px-6 pb-24 pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:pt-28">
        {/* Single restrained brand tint behind the hero, nothing louder. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(closest-side, #8774e1, transparent)' }}
        />

        <div className="relative flex flex-col items-start gap-6">
          <span className="flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1 text-[12px] font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-[#8774e1]" />
            Telegram-style review screenshots
          </span>
          <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-[52px]">
            Chat screenshots that look real. Because they are.
          </h1>
          <p className="max-w-md text-[15.5px] leading-relaxed text-muted-foreground">
            Build Telegram review conversations by hand or generate them with AI, then export
            retina iPhone screenshots that are pixel-identical to the preview.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="brand" size="lg">
              <Link href="/chat-builder">
                Start free
                <ArrowRight size={15} />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/pricing">View pricing</Link>
            </Button>
          </div>
          <p className="text-[12.5px] text-muted-foreground">
            Free to start · no credit card · export in seconds
          </p>
        </div>

        {/* Hero phone — the real chat components, statically composed. */}
        <div className="relative mx-auto w-[402px] max-w-full">
          <div
            className="chat-bg relative h-[640px] overflow-hidden rounded-[44px] border border-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.55)]"
            style={{ '--screen-w': '402px', '--screen-h': '640px' } as React.CSSProperties}
          >
            <div className="absolute left-0 top-0 z-50 flex w-full flex-col gap-2 px-2 pt-3">
              <Header title="Nutrified" subtitle="17 messages" />
              <PinnedMessage text="🆔 707925765 🤑 @Nutrified 👤 Yok ✅ Telegram Premium User 🌐 Language: en" />
            </div>

            <div className="flex h-full flex-col justify-end px-[8px] pb-[84px]">
              {HERO_MESSAGES.map((m, i) => (
                <div key={i} className={`tg-group ${m.out ? 'tg-group--out' : 'tg-group--in'}`}>
                  {!m.out && m.last && (
                    <div className="tg-group-avatar tg-group-avatar--gradient" style={{ background: '#8774e1' }}>
                      <span>Y</span>
                    </div>
                  )}
                  {!m.out && !m.last && <div className="mr-2 w-[var(--tg-avatar-size)] shrink-0" />}
                  <div className="tg-group-bubbles">
                    <MessageBubble
                      id={`hero-${i}`}
                      text={m.text}
                      isSent={m.out}
                      time={m.time}
                      isFirst={m.first}
                      isLast={m.last}
                      sender={m.first && !m.out ? { name: 'Yok' } : undefined}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="absolute bottom-0 left-0 right-0 z-50 w-full px-[10px] pb-[18px]">
              <MessageInput />
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section id="features" className="mx-auto w-full max-w-5xl px-6 pb-24">
        <div className="mb-10 flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight text-white">Everything between idea and screenshot</h2>
          <p className="max-w-lg text-[14px] text-muted-foreground">
            One workspace for writing, styling and rendering review conversations.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="liquid-glass rounded-2xl p-6">
              <div className="relative z-[1] flex flex-col gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#b3a5f2]">
                  <Icon size={16} />
                </span>
                <h3 className="text-[15px] font-semibold tracking-tight text-white">{title}</h3>
                <p className="text-[13.5px] leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────── */}
      <section id="how" className="mx-auto w-full max-w-5xl px-6 pb-24">
        <div className="mb-10 flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight text-white">Three steps, no design tools</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/20 p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground">
                  <Icon size={15} />
                </span>
                <span className="text-[12px] font-medium text-muted-foreground">Step {i + 1}</span>
              </div>
              <h3 className="text-[15px] font-semibold tracking-tight text-white">{title}</h3>
              <p className="text-[13.5px] leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────── */}
      <section id="pricing" className="mx-auto w-full max-w-5xl px-6 pb-24">
        <div className="mb-10 flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight text-white">Simple pricing</h2>
          <p className="text-[14px] text-muted-foreground">Start free. Upgrade when the watermark has to go.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-5 rounded-2xl border border-border bg-muted/20 p-7">
            <div>
              <h3 className="text-[15px] font-semibold text-white">Free</h3>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
                $0<span className="text-[14px] font-normal text-muted-foreground">/month</span>
              </p>
            </div>
            <ul className="flex flex-col gap-2.5">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-[13.5px] text-muted-foreground">
                  <Check size={14} className="shrink-0 text-muted-foreground" />
                  {f}
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" className="mt-auto">
              <Link href="/chat-builder">Start building</Link>
            </Button>
          </div>

          <div className="liquid-glass flex flex-col gap-5 rounded-2xl p-7">
            <div className="relative z-[1]">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-semibold text-white">Pro</h3>
                <span className="rounded-full border border-[#8774e1]/40 bg-[#8774e1]/15 px-2.5 py-0.5 text-[11.5px] font-medium text-[#b3a5f2]">
                  Most popular
                </span>
              </div>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
                $15<span className="text-[14px] font-normal text-muted-foreground">/month billed annually</span>
              </p>
              <p className="mt-1 text-[12.5px] text-muted-foreground">or $19 billed monthly</p>
            </div>
            <ul className="relative z-[1] flex flex-col gap-2.5">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-[13.5px] text-foreground">
                  <Check size={14} className="shrink-0 text-[#b3a5f2]" />
                  {f}
                </li>
              ))}
            </ul>
            <Button asChild variant="brand" className="relative z-[1] mt-auto">
              <Link href="/pricing">
                Upgrade to Pro
                <ArrowRight size={14} />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <Image src="/reviewmockup-logo.png" alt="" width={22} height={22} className="rounded-md" />
            <span className="text-[13px] font-medium text-muted-foreground">
              © {new Date().getFullYear()} ReviewMockup
            </span>
          </div>
          <div className="flex items-center gap-6 text-[13px] text-muted-foreground">
            <Link href="/pricing" className="transition-colors hover:text-white">Pricing</Link>
            <Link href="/exports" className="transition-colors hover:text-white">Exports</Link>
            <Link href="/chat-builder" className="transition-colors hover:text-white">Open app</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
