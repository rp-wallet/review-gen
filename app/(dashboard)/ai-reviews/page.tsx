'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zipSync } from 'fflate';
import {
  BotMessageSquare,
  Bot,
  Package,
  ImagePlus,
  Trash2,
  Wand2,
  Loader2,
  MessagesSquare,
  AlertTriangle,
  CalendarDays,
  Download,
  FolderArchive,
  PencilLine,
  Sparkles,
} from 'lucide-react';
import { ReviewSet, GenerationResult } from '@/lib/types';
import { DeviceId } from '@/lib/devices';
import { getPlatform } from '@/lib/platforms';
import PlatformPicker from '@/components/PlatformPicker';
import PhonePreview from '@/components/PhonePreview';
import WorkspaceHeader from '@/components/WorkspaceHeader';
import AuthModal, { AuthModalVariant } from '@/components/AuthModal';
import { downloadBlob, exportChatScreenshot, renderChatScreenshot } from '@/lib/export-screenshot';
import { useSession } from '@/lib/auth-client';
import { useAppStore } from '@/lib/store';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

type ExampleImage = {
  id: string;
  name: string;
  mimeType: string;
  data: string; // base64, no data: prefix
  preview: string; // full data URL for the thumbnail
};

const EMPTY_REVIEW: ReviewSet = {
  id: 'empty',
  title: 'Preview',
  summary: '',
  customerName: 'Preview',
  pinnedText: '',
  messages: [],
};
const PENDING_ACTION_KEY = 'reviewmockup:pending-action';

function zipEntryName(index: number, name: string) {
  const safe = (name || 'review').replace(/[^\w.-]+/g, '_').slice(0, 40) || 'review';
  return `${String(index + 1).padStart(2, '0')}-${safe}.png`;
}

const CURRENT_YEAR = new Date().getFullYear();

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// The AI emits dates like "June 25" (no year). Parse to yyyy-mm-dd for the
// native date input, assuming the current year when none is present.
function parseLabelToISO(label: string): string {
  if (!label) return toISO(new Date());
  let d = new Date(label);
  if (isNaN(d.getTime())) d = new Date(`${label}, ${CURRENT_YEAR}`);
  if (isNaN(d.getTime())) d = new Date();
  return toISO(d);
}

// Back to the display style — drop the year for the current year (Telegram
// style), keep it otherwise so past-dated chats read correctly.
function formatISOToLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  const base = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  return d.getFullYear() === CURRENT_YEAR ? base : `${base}, ${d.getFullYear()}`;
}

export default function AiReviewsPage() {
  const router = useRouter();
  const { data: session } = useSession();

  // Generator state lives in the app store so results and inputs survive
  // route changes (e.g. Edit review → chat builder → back).
  const {
    result, selectedId, platform, productName, productDesc, count, minMessages, maxMessages,
    hideNames, device, botName, botAvatarInitial, botAvatarColor, botAvatarImage,
  } = useAppStore((s) => s.aiReviews);
  const setAiReviews = useAppStore((s) => s.setAiReviews);
  const setPlatform = useAppStore((s) => s.setPlatform);
  const platformConfig = getPlatform(platform);
  const me = useAppStore((s) => s.me);
  const fetchMe = useAppStore((s) => s.fetchMe);

  const setResult = useCallback(
    (next: GenerationResult | null) => setAiReviews({ result: next }),
    [setAiReviews]
  );
  const setSelectedId = useCallback(
    (next: string | null) => setAiReviews({ selectedId: next }),
    [setAiReviews]
  );

  // Example screenshots stay local — large base64 blobs, session-only input.
  const [examples, setExamples] = useState<ExampleImage[]>([]);

  // Generation state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Refine state — one prompt box, applied to the selected set or all of them.
  const [refinePrompt, setRefinePrompt] = useState('');
  const [refining, setRefining] = useState<'selected' | 'all' | null>(null);
  const [refineError, setRefineError] = useState('');

  const [exporting, setExporting] = useState(false);
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);
  const [authModal, setAuthModal] = useState<AuthModalVariant | null>(null);
  const previewHostRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(
    () => result?.sets.find((s) => s.id === selectedId) ?? result?.sets[0] ?? EMPTY_REVIEW,
    [result, selectedId]
  );

  // Group the selected chat's messages into consecutive runs of the same date —
  // one bucket per DateSeparator the canvas will show, so each gets a picker.
  const dateBuckets = useMemo(() => {
    const out: { label: string; indices: number[] }[] = [];
    selected.messages.forEach((m, i) => {
      const last = out[out.length - 1];
      if (last && last.label === m.date) last.indices.push(i);
      else out.push({ label: m.date, indices: [i] });
    });
    return out;
  }, [selected]);

  const setBucketDate = (indices: number[], iso: string) => {
    if (!result) return;
    const label = formatISOToLabel(iso);
    const idx = new Set(indices);
    setResult({
      ...result,
      sets: result.sets.map((s) =>
        s.id !== selected.id
          ? s
          : { ...s, messages: s.messages.map((m, i) => (idx.has(i) ? { ...m, date: label } : m)) }
      ),
    });
  };

  const handleBotAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setBotAvatarImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleExampleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1] ?? '';
        setExamples((prev) => [
          ...prev,
          { id: `${file.name}-${Date.now()}-${Math.random()}`, name: file.name, mimeType: file.type, data: base64, preview: dataUrl },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeExample = (id: string) => setExamples((prev) => prev.filter((x) => x.id !== id));

  const setProductName = (value: string) => setAiReviews({ productName: value });
  const setProductDesc = (value: string) => setAiReviews({ productDesc: value });
  const setCount = (value: number) => setAiReviews({ count: value });
  const setHideNames = (value: boolean) => setAiReviews({ hideNames: value });
  const setDevice = (value: DeviceId) => setAiReviews({ device: value });
  const setBotName = (value: string) => setAiReviews({ botName: value });
  const setBotAvatarInitial = (value: string) => setAiReviews({ botAvatarInitial: value });
  const setBotAvatarColor = (value: string) => setAiReviews({ botAvatarColor: value });
  const setBotAvatarImage = (value: string) => setAiReviews({ botAvatarImage: value });

  const setMinMessageCount = (value: number) => {
    const next = Math.max(15, Math.min(60, Number(value) || 15));
    setAiReviews({ minMessages: next, maxMessages: Math.max(next, maxMessages) });
  };

  const setMaxMessageCount = (value: number) => {
    const next = Math.max(minMessages, Math.min(60, Number(value) || minMessages));
    setAiReviews({ maxMessages: next });
  };

  const builderImportPayload = useCallback(
    (set: ReviewSet) => ({
      review: set,
      platform,
      botName,
      botAvatarInitial,
      botAvatarColor,
      botAvatarImage,
      showProfileIntro: platformConfig.features.profileIntro,
      hideNames,
      device,
    }),
    [botAvatarColor, botAvatarImage, botAvatarInitial, botName, device, hideNames, platform, platformConfig]
  );

  const editSelectedReview = () => {
    if (!selected.messages.length) return;
    window.localStorage.setItem('reviewmockup:builder-import', JSON.stringify(builderImportPayload(selected)));
    router.push('/chat-builder');
  };

  // Entitlement is cached in the store per user — no refetch on route changes.
  useEffect(() => {
    fetchMe(session?.user?.id ?? null);
  }, [fetchMe, session?.user?.id]);

  const runGenerate = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          product: productName,
          stylePrompt: productDesc,
          count,
          minMessages,
          maxMessages,
          screenshots: examples.map(({ mimeType, data }) => ({ mimeType, data })),
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        if (payload?.error === 'auth_required') {
          window.sessionStorage.setItem(PENDING_ACTION_KEY, 'ai-reviews:generate');
          setAuthModal('upgrade');
          return;
        }
        if (payload?.error === 'upgrade_required') {
          setAuthModal('upgrade');
          return;
        }
        if (payload?.error === 'no_credits') {
          throw new Error('You are out of AI review credits.');
        }
        const detail = typeof payload?.detail === 'string' && payload.detail.trim() ? ` ${payload.detail}` : '';
        throw new Error(`${payload?.error || 'Generation failed.'}${detail}`);
      }
      const sets: ReviewSet[] = payload?.sets ?? [];
      if (!sets.length) throw new Error('The model returned no conversations.');
      setResult(payload);
      setSelectedId(sets[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error.');
      setResult(null);
      setSelectedId(null);
    } finally {
      setLoading(false);
      fetchMe(session?.user?.id ?? null, true);
    }
  }, [count, examples, maxMessages, minMessages, platform, productDesc, productName, fetchMe, session?.user?.id, setResult, setSelectedId]);

  const runRefine = useCallback(
    async (scope: 'selected' | 'all') => {
      if (!result || refining) return;
      const instruction = refinePrompt.trim();
      if (!instruction) return;
      if (!session?.user || !me.isPro) {
        setAuthModal('upgrade');
        return;
      }
      const targets = scope === 'selected'
        ? result.sets.filter((s) => s.id === selected.id)
        : result.sets;
      if (!targets.length) return;

      setRefining(scope);
      setRefineError('');
      try {
        const res = await fetch('/api/refine-reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instruction, sets: targets, product: productName, platform }),
        });
        const payload = await res.json();
        if (!res.ok) {
          if (payload?.error === 'auth_required' || payload?.error === 'upgrade_required') {
            setAuthModal('upgrade');
            return;
          }
          throw new Error(payload?.error || 'Refine failed.');
        }
        const refined: ReviewSet[] = payload?.sets ?? [];
        const byId = new Map(refined.map((s) => [s.id, s]));
        setResult({ ...result, sets: result.sets.map((s) => byId.get(s.id) ?? s) });
        setRefinePrompt('');
      } catch (err) {
        setRefineError(err instanceof Error ? err.message : 'Refine failed.');
      } finally {
        setRefining(null);
      }
    },
    [me.isPro, platform, productName, refinePrompt, refining, result, selected.id, session?.user, setResult]
  );

  const runExport = useCallback(async () => {
    const node = previewHostRef.current?.querySelector<HTMLElement>('.chat-bg');
    if (!node) return;
    setExporting(true);
    try {
      await exportChatScreenshot(node, selected.customerName || 'review', {
        app: platform,
        device,
        title: selected.title || selected.customerName || 'review',
        meta: builderImportPayload(selected),
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'auth_required') {
        window.sessionStorage.setItem(PENDING_ACTION_KEY, 'ai-reviews:export');
        setAuthModal('export');
        return;
      }
      console.error('Unable to export screenshot', err);
    } finally {
      setExporting(false);
    }
  }, [builderImportPayload, device, platform, selected]);

  // Renders every generated set through the same export pipeline, zips the
  // PNGs (store-level — they are already compressed), and downloads one file.
  const runBulkDownload = useCallback(async () => {
    const sets = result?.sets ?? [];
    if (!sets.length || bulk) return;
    setBulk({ done: 0, total: sets.length });
    const previousSelected = selectedId;
    try {
      const files: Record<string, Uint8Array> = {};
      for (let i = 0; i < sets.length; i += 1) {
        const set = sets[i];
        setSelectedId(set.id);
        // Let the preview re-render and its scroll anchor settle on the new set.
        await new Promise((resolve) => setTimeout(resolve, 250));
        const node = previewHostRef.current?.querySelector<HTMLElement>('.chat-bg');
        if (!node) throw new Error('Preview is not ready.');
        const blob = await renderChatScreenshot(node, {
          app: platform,
          device,
          title: set.title || set.customerName,
          meta: builderImportPayload(set),
        });
        files[zipEntryName(i, set.customerName)] = new Uint8Array(await blob.arrayBuffer());
        setBulk({ done: i + 1, total: sets.length });
      }
      const zipped = zipSync(files, { level: 0 });
      const zipBuffer = new Uint8Array(zipped);
      downloadBlob(new Blob([zipBuffer], { type: 'application/zip' }), `${productName || 'reviews'}-screenshots.zip`);
    } catch (err) {
      if (err instanceof Error && err.message === 'auth_required') {
        window.sessionStorage.setItem(PENDING_ACTION_KEY, 'ai-reviews:bulk');
        setAuthModal('export');
      } else {
        setError(err instanceof Error ? err.message : 'Bulk download failed.');
      }
    } finally {
      setSelectedId(previousSelected);
      setBulk(null);
    }
  }, [builderImportPayload, bulk, device, platform, productName, result, selectedId, setSelectedId]);

  const handleBulkDownload = () => {
    if (!session?.user) {
      window.sessionStorage.setItem(PENDING_ACTION_KEY, 'ai-reviews:bulk');
      setAuthModal('export');
      return;
    }
    runBulkDownload();
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has('upgraded')) return;
    window.sessionStorage.setItem(PENDING_ACTION_KEY, 'ai-reviews:generate');
    fetchMe(session?.user?.id ?? null, true);
    router.replace('/ai-reviews');
  }, [fetchMe, router, session?.user?.id]);

  useEffect(() => {
    if (!session?.user) return;
    const pendingAction = window.sessionStorage.getItem(PENDING_ACTION_KEY);
    if (pendingAction === 'ai-reviews:export' || pendingAction === 'ai-reviews:bulk') {
      window.sessionStorage.removeItem(PENDING_ACTION_KEY);
      const resume = window.setTimeout(() => {
        setAuthModal(null);
        if (pendingAction === 'ai-reviews:bulk') runBulkDownload();
        else runExport();
      }, 0);
      return () => window.clearTimeout(resume);
    }
    if (pendingAction === 'ai-reviews:generate' && me.isPro) {
      window.sessionStorage.removeItem(PENDING_ACTION_KEY);
      const resume = window.setTimeout(() => {
        setAuthModal(null);
        runGenerate();
      }, 0);
      return () => window.clearTimeout(resume);
    }
  }, [me.isPro, runBulkDownload, runExport, runGenerate, session?.user]);

  // Exporting needs an account; generating is a Pro feature.
  const handleExport = () => {
    if (!session?.user) {
      window.sessionStorage.setItem(PENDING_ACTION_KEY, 'ai-reviews:export');
      setAuthModal('export');
      return;
    }
    runExport();
  };

  const generate = () => {
    if (!session?.user) {
      window.sessionStorage.setItem(PENDING_ACTION_KEY, 'ai-reviews:generate');
      setAuthModal('upgrade');
      return;
    }
    if (!me.isPro) {
      setAuthModal('upgrade');
      return;
    }
    runGenerate();
  };

  const handleAuthComplete = async () => {
    const variant = authModal;
    if (variant === 'upgrade') {
      await fetchMe(session?.user?.id ?? null, true);
      return;
    }
    const pendingAction = window.sessionStorage.getItem(PENDING_ACTION_KEY);
    window.sessionStorage.removeItem(PENDING_ACTION_KEY);
    setAuthModal(null);
    if (pendingAction === 'ai-reviews:bulk') runBulkDownload();
    else runExport();
  };

  return (
    <div className="workspace">
      <AuthModal
        open={authModal !== null}
        variant={authModal ?? 'export'}
        onClose={() => setAuthModal(null)}
        onComplete={handleAuthComplete}
      />
      <WorkspaceHeader
        title="AI Reviews"
        subtitle="Generate unique conversations"
        meta={result ? `${result.sets.length} generated` : undefined}
        device={device}
        onDeviceChange={setDevice}
      >
        {(result?.sets.length ?? 0) > 1 && (
          <Button variant="outline" onClick={handleBulkDownload} disabled={!!bulk || exporting || loading || !!refining}>
            {bulk ? <Loader2 className="animate-spin" /> : <FolderArchive />}
            {bulk ? `Zipping ${bulk.done}/${bulk.total}…` : 'Download all (ZIP)'}
          </Button>
        )}
        <Button variant="brand" onClick={handleExport} disabled={exporting || !!bulk || !!refining || !selected.messages.length}>
          {exporting ? <Loader2 className="animate-spin" /> : <Download />}
          {exporting ? 'Rendering…' : 'Export screenshot'}
        </Button>
      </WorkspaceHeader>

      <div className="workspace-grid workspace-grid--builder">
        {/* ── Results list ───────────────────────────────────────── */}
        <section className="dashboard-messages">
          <div className="panel-head">
            <div>
              <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground">
                Results
                {result && <Badge variant="muted">{result.sets.length}</Badge>}
              </h2>
              <p className="text-[12px] text-muted-foreground">Select one to preview it</p>
            </div>
            {/* Reddit thread layout has no builder canvas yet. */}
            {selected.messages.length > 0 && !loading && platform !== 'reddit' && (
              <Button variant="brand" size="sm" onClick={editSelectedReview}>
                <PencilLine size={14} />
                Edit review
              </Button>
            )}
          </div>

          <div
            className="panel-scroll"
            onScroll={(e) => {
              const t = e.currentTarget;
              const isBottom = Math.abs(t.scrollHeight - t.scrollTop - t.clientHeight) < 2;
              t.classList.toggle('is-bottom', isBottom);
            }}
          >
            {!result && !loading && (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
                <BotMessageSquare size={26} className="text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">No reviews yet</p>
                  <p className="text-[13px] text-muted-foreground">Set up the generator on the right and hit Generate.</p>
                </div>
              </div>
            )}

            {loading && (
              <div className="flex flex-col gap-3">
                {Array.from({ length: Math.min(count, 6) }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-muted/40" />
                ))}
              </div>
            )}

            {result && !loading && (
              <div className="flex flex-col gap-3">
                {result.sets.map((set, idx) => {
                  const active = set.id === (selectedId ?? result.sets[0].id);
                  return (
                    <button
                      key={set.id}
                      type="button"
                      onClick={() => setSelectedId(set.id)}
                      aria-pressed={active}
                      className={`result-card${active ? ' is-active' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <span className="text-muted-foreground">#{idx + 1}</span>
                          {set.title || set.customerName}
                        </span>
                        <Badge variant="muted">
                          <MessagesSquare size={11} />
                          {set.messages.length}
                        </Badge>
                      </div>
                      {set.summary && (
                        <p className="line-clamp-2 text-left text-[13px] text-muted-foreground">{set.summary}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── Preview (center) ───────────────────────────────────── */}
        <PhonePreview
          review={selected}
          platform={platform}
          botName={botName}
          botAvatarInitial={botAvatarInitial}
          botAvatarColor={botAvatarColor}
          botAvatarImage={botAvatarImage}
          showProfileIntro={platformConfig.features.profileIntro}
          hideNames={platformConfig.features.hideNames && hideNames}
          device={device}
          downloadName={selected.customerName || 'review'}
          hideCta
          hostRef={previewHostRef}
        />

        {/* ── Generator panel ────────────────────────────────────── */}
        <aside className="dashboard-sidebar">
          <div className="panel-head py-5">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Generator</h2>
              <p className="text-[12px] text-muted-foreground">Configure, then generate</p>
            </div>
          </div>

          <div
            className="panel-scroll"
            onScroll={(e) => {
              const t = e.currentTarget;
              const isBottom = Math.abs(t.scrollHeight - t.scrollTop - t.clientHeight) < 2;
              t.classList.toggle('is-bottom', isBottom);
            }}
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                {/* Reddit stays disabled until its thread canvas exists — the
                    preview would otherwise render Telegram chrome for it. */}
                <PlatformPicker value={platform} onChange={setPlatform} disabled={['reddit']} />
                <p className="px-1 text-[11.5px] text-muted-foreground">
                  Reviews are generated as {platformConfig.label} {platformConfig.conversationNoun}s
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package size={14} className="text-muted-foreground" />
                    Product
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 pt-4">
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="ai-product">Name</Label>
                    <Input id="ai-product" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g. LarperWallet" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="ai-desc">Description &amp; vibe</Label>
                    <Textarea id="ai-desc" className="min-h-24" value={productDesc} onChange={(e) => setProductDesc(e.target.value)} placeholder="What it is, the tone, how conversations should feel…" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImagePlus size={14} className="text-muted-foreground" />
                    Example reviews
                    <Badge variant="muted">optional</Badge>
                  </CardTitle>
                  <CardDescription>Screenshots the AI studies for lingo &amp; vibe</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 pt-4">
                  <Separator />
                  {examples.length > 0 && (
                    <div className="grid grid-cols-4 gap-2.5">
                      {examples.map((img) => (
                        <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.preview} alt={img.name} className="size-full object-cover" />
                          <button type="button" aria-label={`Remove ${img.name}`} onClick={() => removeExample(img.id)} className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                            <Trash2 size={13} className="text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="upload-zone">
                    <ImagePlus size={17} />
                    Add screenshots
                    <small>PNG or JPG · add as many as you like</small>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleExampleUpload} />
                  </label>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex flex-col gap-4 p-5">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="ai-count">Number of reviews</Label>
                    <Input id="ai-count" type="number" min={1} max={25} value={count} onChange={(e) => setCount(Math.max(1, Math.min(25, Number(e.target.value) || 1)))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="ai-min-messages">Min messages</Label>
                      <Input
                        id="ai-min-messages"
                        type="number"
                        min={15}
                        max={60}
                        value={minMessages}
                        onChange={(e) => setMinMessageCount(Number(e.target.value))}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="ai-max-messages">Max messages</Label>
                      <Input
                        id="ai-max-messages"
                        type="number"
                        min={minMessages}
                        max={60}
                        value={maxMessages}
                        onChange={(e) => setMaxMessageCount(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  {platformConfig.features.hideNames && (
                    <label htmlFor="ai-hide-names" className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                      <span className="flex flex-col gap-0.5">
                        <span className="text-[13px] font-medium text-foreground">Hide names</span>
                        <span className="text-[11.5px] text-muted-foreground">
                          {platformConfig.features.pinnedMessage
                            ? 'Marker stroke over the header name and pinned username'
                            : 'Marker stroke over the header name'}
                        </span>
                      </span>
                      <Switch id="ai-hide-names" checked={hideNames} onCheckedChange={setHideNames} />
                    </label>
                  )}
                  <Button
                    variant="brand"
                    size="lg"
                    onClick={generate}
                    disabled={loading || !!refining || (me.isPro && me.credits < count)}
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <Wand2 />}
                    {loading
                      ? 'Generating…'
                      : me.isPro && me.credits < count
                        ? 'Not enough credits'
                        : `Generate ${count}`}
                  </Button>
                  {me.isPro && (
                    <p className="-mt-1 text-center text-[12px] text-muted-foreground">
                      Uses {count} credit{count === 1 ? '' : 's'} · {me.credits} left
                    </p>
                  )}
                  {error && (
                    <p className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-[12px] text-destructive">
                      <AlertTriangle size={14} className="mt-px shrink-0" />
                      {error}
                    </p>
                  )}
                </CardContent>
              </Card>

              {result && !loading && selected.messages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles size={14} className="text-brand" />
                      Refine with AI
                    </CardTitle>
                    <CardDescription>Describe a change, then apply it to one review or all of them</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 pt-4">
                    <Separator />
                    <Textarea
                      value={refinePrompt}
                      onChange={(e) => setRefinePrompt(e.target.value)}
                      className="min-h-20"
                      placeholder="e.g. Make the customer more skeptical at first, or mention the mobile app…"
                      disabled={!!refining}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => runRefine('selected')}
                        disabled={!!refining || !refinePrompt.trim()}
                      >
                        {refining === 'selected' ? <Loader2 className="animate-spin" /> : <Sparkles />}
                        This review
                      </Button>
                      <Button
                        variant="brand"
                        onClick={() => runRefine('all')}
                        disabled={!!refining || !refinePrompt.trim()}
                      >
                        {refining === 'all' ? <Loader2 className="animate-spin" /> : <Wand2 />}
                        All {result.sets.length}
                      </Button>
                    </div>
                    {refineError && (
                      <p className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-[12px] text-destructive">
                        <AlertTriangle size={14} className="mt-px shrink-0" />
                        {refineError}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {result && !loading && selected.messages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays size={14} className="text-muted-foreground" />
                      Dates
                    </CardTitle>
                    <CardDescription>Set the day each part of the chat happened</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 pt-0">
                    {dateBuckets.map((b, i) => (
                      <div key={i} className="flex items-center justify-between gap-3">
                        <div className="flex flex-col">
                          <span className="text-[13px] text-foreground">
                            {dateBuckets.length > 1 ? `Day ${i + 1}` : 'Date'}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {b.indices.length} message{b.indices.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <Input
                          type="date"
                          aria-label={dateBuckets.length > 1 ? `Date for day ${i + 1}` : 'Conversation date'}
                          className="dash-date w-40"
                          value={parseLabelToISO(b.label)}
                          onChange={(e) => e.target.value && setBucketDate(b.indices, e.target.value)}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot size={14} className="text-brand" />
                    {platformConfig.senderLabels.support} identity
                  </CardTitle>
                  <CardDescription>Used only in the preview header</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 pt-4">
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="ai-bot-name">Name</Label>
                    <Input id="ai-bot-name" value={botName} onChange={(e) => setBotName(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-[1fr_auto] gap-3">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="ai-bot-initial">Avatar initial</Label>
                      <Input id="ai-bot-initial" className="text-center" value={botAvatarInitial} maxLength={2} onChange={(e) => setBotAvatarInitial(e.target.value)} />
                    </div>
                    <div className="flex w-20 flex-col gap-2">
                      <Label htmlFor="ai-bot-color">Color</Label>
                      <input id="ai-bot-color" type="color" className="dash-color" value={botAvatarColor} onChange={(e) => setBotAvatarColor(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Display picture</Label>
                    <div className="flex items-center gap-3">
                      {botAvatarImage && (
                        <div className="group relative size-10 shrink-0 overflow-hidden rounded-full border border-border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={botAvatarImage} alt="Bot avatar" className="size-full object-cover" />
                          <button type="button" aria-label="Remove image" onClick={() => setBotAvatarImage('')} className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                            <Trash2 size={14} className="text-white" />
                          </button>
                        </div>
                      )}
                      <Button asChild variant="outline" size="sm" className="cursor-pointer">
                        <label>
                          <ImagePlus size={14} />
                          {botAvatarImage ? 'Change' : 'Upload image'}
                          <input type="file" accept="image/*" className="hidden" onChange={handleBotAvatarUpload} />
                        </label>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
