'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ChatCanvas from '@/components/ChatCanvas';
import { ReviewSet, ScreenshotInput } from '@/lib/types';
import { BarChart3, Bot, ClipboardList, Download, ImagePlus, KeyRound, Play, Sparkles, Wand2 } from 'lucide-react';

const defaultQueue = [
  { title: 'Wallet migration resolved', meta: '6 messages · thankful · screenshot' },
  { title: 'Custom app inquiry', meta: '14 messages · casual · premium user' },
  { title: 'Login reset follow-up', meta: '9 messages · confused → resolved' },
];

const defaultToneTags = ['casual', 'support-led', 'short replies', 'crypto wallet', 'Telegram dark', 'bot admin'];

function fileToScreenshot(file: File): Promise<ScreenshotInput> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const [, data = ''] = result.split(',');
      resolve({ name: file.name, mimeType: file.type || 'image/png', data });
    };
    reader.onerror = () => reject(reader.error || new Error('Could not read screenshot.'));
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [product, setProduct] = useState('LarperWallet');
  const [scenario, setScenario] = useState('support-resolution');
  const [bulkCount, setBulkCount] = useState(5);
  const [stylePrompt, setStylePrompt] = useState('Match casual Telegram support conversations where the customer starts confused, support guides them, and the ending feels naturally thankful.');
  const [screenshots, setScreenshots] = useState<ScreenshotInput[]>([]);
  const [generatedReviews, setGeneratedReviews] = useState<ReviewSet[]>([]);
  const [selectedReview, setSelectedReview] = useState<ReviewSet | null>(null);
  const [toneTags, setToneTags] = useState(defaultToneTags);
  const [notes, setNotes] = useState('The current staged Telegram conversation is the default preview. Generate with Gemini to populate review sets and load them into the phone.');
  const [confidence, setConfidence] = useState(92);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);

  // Scale the fixed 402x874 phone to fit the available space, so its internal
  // layout stays identical regardless of browser zoom or window height.
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const update = () => {
      const scale = Math.min(el.clientWidth / 402, el.clientHeight / 874, 1);
      el.style.setProperty('--phone-scale', String(scale));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const dashboardStats = useMemo(() => [
    { label: 'Review sets', value: String(generatedReviews.length || 0), trend: generatedReviews.length ? 'generated' : 'default stage' },
    { label: 'Screenshots', value: String(screenshots.length), trend: screenshots.length ? 'attached' : 'optional' },
    { label: 'Tone match', value: `${confidence}%`, trend: toneTags[0] || 'Telegram dark' },
    { label: 'Ready queue', value: String(generatedReviews.length), trend: generatedReviews.length ? 'exportable' : 'empty' },
  ], [confidence, generatedReviews.length, screenshots.length, toneTags]);

  async function handleScreenshotChange(files: FileList | null) {
    if (!files?.length) return;
    setError('');
    const next = await Promise.all(Array.from(files).slice(0, 8).map(fileToScreenshot));
    setScreenshots(next);
  }

  async function generateReviews() {
    setError('');

    if (!apiKey.trim()) {
      setError('Add your Gemini API key first.');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          product,
          scenario,
          count: bulkCount,
          stylePrompt,
          screenshots,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Generation failed.');
      }

      const sets = Array.isArray(payload.sets) ? payload.sets : [];
      if (!sets.length) {
        throw new Error('Gemini did not return any review sets.');
      }

      const normalized = sets.map((set: Partial<ReviewSet>, index: number) => ({
        id: set.id || `set-${index + 1}`,
        title: set.title || `Generated review ${index + 1}`,
        summary: set.summary || 'Generated Telegram review conversation',
        customerName: set.customerName || 'Alfz',
        pinnedText: set.pinnedText || `ID ${Math.floor(1000000000 + Math.random() * 8999999999)} 👤 ${set.customerName || 'Customer'} 🌐 Language: en`,
        messages: Array.isArray(set.messages) ? set.messages.map((message) => ({
          sender: message.sender === 'support' ? 'support' : 'customer',
          text: message.text || '',
          time: message.time || '03:46 PM',
          date: message.date || 'June 25',
          replyTo: typeof message.replyTo === 'number' ? message.replyTo : undefined,
        })).filter((message) => message.text.trim()).slice(0, 18) : [],
      })).filter((set: ReviewSet) => set.messages.length);

      if (!normalized.length) {
        throw new Error('Gemini returned sets without usable messages.');
      }

      setGeneratedReviews(normalized);
      setSelectedReview(normalized[0]);
      setToneTags(Array.isArray(payload.toneTags) && payload.toneTags.length ? payload.toneTags.slice(0, 8) : defaultToneTags);
      setNotes(payload.notes || 'Generated from Gemini using the supplied product, scenario, style prompt, and screenshots.');
      setConfidence(Math.max(0, Math.min(Number(payload.confidence) || 88, 100)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed.');
    } finally {
      setIsGenerating(false);
    }
  }

  function exportSet() {
    const data = selectedReview ? [selectedReview] : generatedReviews;
    const blob = new Blob([JSON.stringify({ product, scenario, reviews: data }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = selectedReview ? `${selectedReview.id}.json` : 'telegram-review-set.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar dashboard-panel">
        <div className="dashboard-brand">
          <div className="dashboard-logo"><Bot size={22} /></div>
          <div>
            <h1>Review Generator</h1>
            <p>Internal Telegram review lab</p>
          </div>
        </div>

        <div className="dashboard-section">
          <div className="dashboard-section-title">
            <KeyRound size={16} /> Gemini
          </div>
          <label className="dashboard-field">
            API key
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="AIza..."
              autoComplete="off"
            />
          </label>
        </div>

        <div className="dashboard-section">
          <div className="dashboard-section-title">
            <Sparkles size={16} /> Campaign
          </div>
          <label className="dashboard-field">
            Product
            <input value={product} onChange={(event) => setProduct(event.target.value)} />
          </label>
          <label className="dashboard-field">
            Scenario
            <select value={scenario} onChange={(event) => setScenario(event.target.value)}>
              <option value="support-resolution">Support resolution</option>
              <option value="migration">Wallet migration</option>
              <option value="custom-app">Custom app request</option>
              <option value="feedback">Feedback ask</option>
            </select>
          </label>
          <label className="dashboard-field">
            Bulk count: {bulkCount}
            <input type="range" min="1" max="25" value={bulkCount} onChange={(event) => setBulkCount(Number(event.target.value))} />
          </label>
        </div>

        <div className="dashboard-section">
          <div className="dashboard-section-title">
            <Wand2 size={16} /> AI Style Input
          </div>
          <label className="dashboard-upload">
            <ImagePlus size={18} />
            <span>{screenshots.length ? `${screenshots.length} screenshot${screenshots.length === 1 ? '' : 's'} attached` : 'Drop screenshots'}</span>
            <small>Analyze lingo, tone, pacing, and visual format</small>
            <input type="file" accept="image/*" multiple onChange={(event) => handleScreenshotChange(event.target.files)} />
          </label>
          <textarea className="dashboard-textarea" value={stylePrompt} onChange={(event) => setStylePrompt(event.target.value)} />
          {error && <p className="dashboard-error">{error}</p>}
        </div>

        <div className="dashboard-actions">
          <button className="dashboard-primary" onClick={generateReviews} disabled={isGenerating}>
            <Play size={16} /> {isGenerating ? 'Generating...' : 'Generate reviews'}
          </button>
          <button className="dashboard-secondary" onClick={exportSet} disabled={!generatedReviews.length}>
            <Download size={16} /> Export set
          </button>
        </div>
      </aside>

      <section className="dashboard-main">
        <div className="dashboard-preview-wrap dashboard-panel" ref={previewRef}>
          <ChatCanvas review={selectedReview} />
        </div>
      </section>

      <aside className="dashboard-inspector dashboard-panel">
        <div className="dashboard-section-title">
          <BarChart3 size={16} /> Readout
        </div>
        <div className="dashboard-score">
          <strong>{confidence}%</strong>
          <span>style confidence</span>
        </div>

        <div className="dashboard-stats compact-stats">
          {dashboardStats.map((item) => (
            <div className="dashboard-stat" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.trend}</small>
            </div>
          ))}
        </div>

        <div className="dashboard-section compact">
          <div className="dashboard-section-title">
            <ClipboardList size={16} /> Review Queue
          </div>
          <div className="dashboard-queue">
            {generatedReviews.length ? generatedReviews.map((item) => (
              <button
                key={item.id}
                className={selectedReview?.id === item.id ? 'is-active' : ''}
                onClick={() => setSelectedReview(item)}
              >
                <strong>{item.title}</strong>
                <span>{item.messages.length} messages · {item.summary}</span>
              </button>
            )) : defaultQueue.map((item) => (
              <button key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.meta}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="dashboard-section compact">
          <div className="dashboard-section-title">Tone Tags</div>
          <div className="dashboard-tags">
            {toneTags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
        </div>

        <div className="dashboard-section compact">
          <div className="dashboard-section-title">Generation Notes</div>
          <p className="dashboard-note">{notes}</p>
        </div>
      </aside>
    </main>
  );
}


