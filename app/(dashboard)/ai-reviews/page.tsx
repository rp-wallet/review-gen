'use client';

import { useMemo, useRef, useState } from 'react';
import {
  Sparkles,
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
} from 'lucide-react';
import { ReviewSet, GenerationResult } from '@/lib/types';
import PhonePreview from '@/components/PhonePreview';
import WorkspaceHeader from '@/components/WorkspaceHeader';
import { exportChatScreenshot } from '@/lib/export-screenshot';

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
  // Bot identity (preview only — not sent to the model)
  const [botName, setBotName] = useState('LarperWallet_bot');
  const [botAvatarInitial, setBotAvatarInitial] = useState('L');
  const [botAvatarColor, setBotAvatarColor] = useState('#8774e1');
  const [botAvatarImage, setBotAvatarImage] = useState('');

  // Generation inputs
  const [productName, setProductName] = useState('LarperWallet');
  const [productDesc, setProductDesc] = useState('A wallet app. Casual Telegram support chats that end in a positive review.');
  const [examples, setExamples] = useState<ExampleImage[]>([]);
  const [count, setCount] = useState(5);

  // Generation state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
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

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: productName,
          stylePrompt: productDesc,
          count,
          screenshots: examples.map(({ mimeType, data }) => ({ mimeType, data })),
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'Generation failed.');
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
    }
  };

  const handleExport = async () => {
    const node = previewHostRef.current?.querySelector<HTMLElement>('.chat-bg');
    if (!node) return;
    setExporting(true);
    try {
      await exportChatScreenshot(node, selected.customerName || 'review');
    } catch (err) {
      console.error('Unable to export screenshot', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="workspace">
      <WorkspaceHeader
        title="AI Reviews"
        subtitle="Generate unique conversations"
        meta={result ? `${result.sets.length} generated` : undefined}
      >
        <Button variant="brand" onClick={handleExport} disabled={exporting || !selected.messages.length}>
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
            {result?.toneTags && result.toneTags.length > 0 && (
              <div className="flex flex-wrap justify-end gap-1.5">
                {result.toneTags.slice(0, 2).map((t) => (
                  <Badge key={t} variant="brand">{t}</Badge>
                ))}
              </div>
            )}
          </div>

          <div className="panel-scroll">
            {!result && !loading && (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
                <Sparkles size={26} className="text-muted-foreground" />
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
          botName={botName}
          botAvatarInitial={botAvatarInitial}
          botAvatarColor={botAvatarColor}
          botAvatarImage={botAvatarImage}
          showProfileIntro
          downloadName={selected.customerName || 'review'}
          hideCta
          hostRef={previewHostRef}
        />

        {/* ── Generator panel ────────────────────────────────────── */}
        <aside className="dashboard-sidebar">
          <div className="panel-head">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Generator</h2>
              <p className="text-[12px] text-muted-foreground">Configure, then generate</p>
            </div>
          </div>

          <div className="panel-scroll">
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package size={14} className="text-muted-foreground" />
                    Product
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 pt-0">
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
                <CardContent className="flex flex-col gap-4 pt-0">
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
                  <Button variant="brand" size="lg" onClick={generate} disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : <Wand2 />}
                    {loading ? 'Generating…' : `Generate ${count}`}
                  </Button>
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
                    Bot identity
                  </CardTitle>
                  <CardDescription>Used only in the preview header</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 pt-0">
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
