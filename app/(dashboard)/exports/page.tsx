'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FolderDown,
  Loader2,
  LogIn,
  MessageSquare,
  Camera,
  UserRound,
  PencilLine,
  Search,
  Info,
  X,
  Pin,
  Send,
  FileJson,
  Copy,
  Check,
  ArrowRight,
} from 'lucide-react';
import WorkspaceHeader from '@/components/WorkspaceHeader';
import AuthModal from '@/components/AuthModal';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSession } from '@/lib/auth-client';
import { getDevice } from '@/lib/devices';
import { downloadBlob } from '@/lib/export-screenshot';
import type { ReviewMessage, ReviewSet } from '@/lib/types';

type ExportMeta = {
  review?: ReviewSet;
  botName?: string;
  botAvatarInitial?: string;
  botAvatarColor?: string;
  showProfileIntro?: boolean;
  hideNames?: boolean;
  device?: string;
};

type ExportRow = {
  id: string;
  app: 'telegram' | 'instagram' | 'twitter';
  device: string | null;
  width: number;
  height: number;
  title: string | null;
  meta: ExportMeta | null;
  createdAt: string;
};

const APP_LABELS = { telegram: 'Telegram', instagram: 'Instagram', twitter: 'X / Twitter' } as const;
const APP_ICONS = { telegram: Send, instagram: Camera, twitter: UserRound } as const;
const BANNER_KEY = 'reviewmockup:exports-banner-dismissed';

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const sameDay = date.toDateString() === new Date().toDateString();
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `today, ${time}`;
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${time}`;
}

function formatDateLong(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function firstMessage(row: ExportRow, sender: ReviewMessage['sender']) {
  return row.meta?.review?.messages?.find((m) => m.sender === sender);
}

function lastMessageText(row: ExportRow) {
  const messages = row.meta?.review?.messages;
  return messages?.length ? messages[messages.length - 1].text : '';
}

export default function ExportsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [rows, setRows] = useState<ExportRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bannerOpen, setBannerOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setBannerOpen(window.localStorage.getItem(BANNER_KEY) !== '1');
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/exports');
      if (!response.ok) {
        setRows([]);
        return;
      }
      const payload = await response.json();
      setRows(Array.isArray(payload?.exports) ? payload.exports : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user) load();
  }, [load, session?.user]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const term = query.trim().toLowerCase();
    const matched = term
      ? rows.filter((row) =>
          [row.title, row.meta?.review?.customerName, row.meta?.botName]
            .some((field) => field?.toLowerCase().includes(term))
        )
      : rows;
    return [...matched].sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sort === 'newest' ? -diff : diff;
    });
  }, [query, rows, sort]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  const dismissBanner = () => {
    setBannerOpen(false);
    window.localStorage.setItem(BANNER_KEY, '1');
  };

  const openInBuilder = (row: ExportRow) => {
    if (!row.meta?.review) return;
    window.localStorage.setItem('reviewmockup:builder-import', JSON.stringify(row.meta));
    router.push('/chat-builder');
  };

  const downloadMetadata = (row: ExportRow) => {
    const blob = new Blob([JSON.stringify(row, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `${(row.title || 'export').replace(/[^\w.-]+/g, '_')}-metadata.json`);
  };

  const copyMetadata = async (row: ExportRow) => {
    await navigator.clipboard.writeText(JSON.stringify(row.meta ?? row, null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="workspace">
      <AuthModal
        open={authOpen}
        variant="export"
        onClose={() => setAuthOpen(false)}
        onComplete={() => {
          setAuthOpen(false);
          load();
        }}
      />
      <WorkspaceHeader
        title="Exports"
        subtitle="Open previous exports and continue editing the source chat"
        meta={rows?.length ? `${rows.length} exports` : undefined}
      >
        <div className="exports-search">
          <Search size={14} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search exports…"
            aria-label="Search exports"
          />
        </div>
        <Select value={sort} onValueChange={(value) => setSort(value as 'newest' | 'oldest')}>
          <SelectTrigger size="sm" aria-label="Sort exports" className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Sort: Newest</SelectItem>
            <SelectItem value="oldest">Sort: Oldest</SelectItem>
          </SelectContent>
        </Select>
      </WorkspaceHeader>

      {!session?.user && !isPending ? (
        <div className="exports-empty">
          <FolderDown size={26} className="text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Sign in to see your exports</p>
          <p className="text-[13px] text-muted-foreground">Your export history is saved to your account.</p>
          <Button variant="brand" size="sm" onClick={() => setAuthOpen(true)}>
            <LogIn size={14} />
            Sign in
          </Button>
        </div>
      ) : loading || rows === null ? (
        <div className="exports-empty">
          <Loader2 size={22} className="animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="exports-empty">
          <FolderDown size={26} className="text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No exports yet</p>
          <p className="text-[13px] text-muted-foreground">
            Screenshots you export are logged here with their full chat setup.
          </p>
        </div>
      ) : (
        <div className="exports-grid">
          {/* ── List ─────────────────────────────────────────────── */}
          <div className="exports-col">
            {bannerOpen && (
              <div className="exports-banner">
                <span className="exports-banner__icon"><Info size={14} /></span>
                <div>
                  <p className="exports-banner__title">Exports save your chat setup and metadata so you can reopen and edit later.</p>
                  <p className="exports-banner__sub">We don&apos;t store final screenshots — only your conversation data and settings.</p>
                </div>
                <button type="button" className="exports-banner__close" aria-label="Dismiss" onClick={dismissBanner}>
                  <X size={15} />
                </button>
              </div>
            )}

            <div className="exports-list">
              {filtered.length === 0 && (
                <div className="exports-empty exports-empty--inline">
                  <Search size={18} className="text-muted-foreground" />
                  <p className="text-[13px] text-muted-foreground">Nothing matches “{query}”.</p>
                </div>
              )}
              {filtered.map((row) => {
                const AppIcon = APP_ICONS[row.app] ?? MessageSquare;
                const incoming = firstMessage(row, 'customer');
                const outgoing = firstMessage(row, 'support');
                const pinned = Boolean(row.meta?.showProfileIntro && row.meta?.review?.pinnedText);
                const isActive = selected?.id === row.id;
                return (
                  <div
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(row.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedId(row.id);
                      }
                    }}
                    className={`export-card${isActive ? ' is-active' : ''}`}
                  >
                    {/* Mini chat preview rendered from stored metadata. */}
                    <div className="export-card__preview" aria-hidden="true">
                      {pinned && (
                        <span className="export-card__pin">
                          <Pin size={8} />
                          Pinned Message
                        </span>
                      )}
                      {incoming && <span className="export-card__bubble export-card__bubble--in">{incoming.text}</span>}
                      {outgoing && <span className="export-card__bubble export-card__bubble--out">{outgoing.text}</span>}
                    </div>

                    <div className="export-card__body">
                      <div className="export-card__title-row">
                        <span className="export-card__app-icon"><AppIcon size={13} /></span>
                        <h3 className="export-card__title">{row.title || 'Untitled export'}</h3>
                      </div>
                      <div className="export-card__fields">
                        <span><small>Customer</small>{row.meta?.review?.customerName || '—'}</span>
                        <span><small>Bot / Sender</small>{row.meta?.botName || '—'}</span>
                        <span><small>Messages</small>{row.meta?.review?.messages?.length ?? '—'}</span>
                      </div>
                      <div className="export-card__chips">
                        <span className="export-chip">{APP_LABELS[row.app]}</span>
                        <span className="export-chip">{getDevice(row.device ?? undefined).label}</span>
                        <span className="export-chip">Dark</span>
                        <span className="export-card__date">Exported {formatDate(row.createdAt)}</span>
                      </div>
                    </div>

                    <Button
                      variant="brand"
                      size="sm"
                      className="export-card__open"
                      disabled={!row.meta?.review}
                      onClick={(event) => {
                        event.stopPropagation();
                        openInBuilder(row);
                      }}
                    >
                      Open in Builder
                      <ArrowRight size={13} />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Details panel ───────────────────────────────────── */}
          {selected && (
            <aside className="export-details">
              <div className="export-details__head">
                <span className="export-details__avatar" style={{ background: selected.meta?.botAvatarColor || '#3478F6' }}>
                  {(selected.meta?.botAvatarInitial || selected.title || 'E').slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <h3 className="export-details__title">{selected.title || 'Untitled export'}</h3>
                  <p className="export-details__sub">Exported {formatDate(selected.createdAt)}</p>
                </div>
              </div>

              <div className="export-details__section">
                <h4>Customer</h4>
                <div className="export-details__kv">
                  <span>Name</span><strong>{selected.meta?.review?.customerName || '—'}</strong>
                </div>
              </div>

              <div className="export-details__section">
                <h4>Conversation</h4>
                <div className="export-details__kv"><span>Bot / Sender</span><strong>{selected.meta?.botName || '—'}</strong></div>
                <div className="export-details__kv"><span>Messages</span><strong>{selected.meta?.review?.messages?.length ?? '—'}</strong></div>
                <div className="export-details__kv">
                  <span>Pinned message</span>
                  <strong>{selected.meta?.showProfileIntro && selected.meta?.review?.pinnedText ? 'Enabled' : 'Off'}</strong>
                </div>
                <div className="export-details__kv"><span>Hide names</span><strong>{selected.meta?.hideNames ? 'On' : 'Off'}</strong></div>
                {lastMessageText(selected) && (
                  <div className="export-details__kv export-details__kv--stack">
                    <span>Last message</span>
                    <strong className="export-details__last">{lastMessageText(selected)}</strong>
                  </div>
                )}
              </div>

              <div className="export-details__section">
                <h4>Appearance</h4>
                <div className="export-details__kv"><span>Platform</span><strong>{APP_LABELS[selected.app]}</strong></div>
                <div className="export-details__kv"><span>Device</span><strong>{getDevice(selected.device ?? undefined).label}</strong></div>
                <div className="export-details__kv"><span>Resolution</span><strong>{selected.width}×{selected.height} @3x</strong></div>
                <div className="export-details__kv"><span>Exported</span><strong>{formatDateLong(selected.createdAt)}</strong></div>
              </div>

              <div className="export-details__actions">
                <Button
                  variant="brand"
                  className="w-full"
                  disabled={!selected.meta?.review}
                  onClick={() => openInBuilder(selected)}
                >
                  <PencilLine size={14} />
                  Open in Chat Builder
                </Button>
                <Button variant="outline" className="w-full" onClick={() => downloadMetadata(selected)}>
                  <FileJson size={14} />
                  Download metadata
                </Button>
                <Button variant="outline" className="w-full" onClick={() => copyMetadata(selected)}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy metadata'}
                </Button>
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
