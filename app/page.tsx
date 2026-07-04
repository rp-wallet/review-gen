'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Header from '@/components/Header';
import PinnedMessage from '@/components/PinnedMessage';
import MessageBubble from '@/components/MessageBubble';
import MessageInput from '@/components/MessageInput';
import DateSeparator from '@/components/DateSeparator';
import ServiceMessage from '@/components/ServiceMessage';
import ScrollAnchor from '@/components/ScrollAnchor';
import StatusBar from '@/components/StatusBar';
import { BarChart3, Bot, ClipboardList, Download, ImagePlus, KeyRound, Play, Sparkles, Wand2 } from 'lucide-react';

/* ── Shared sender ──────────────────────────── */

const bot = {
  name: 'LarperWallet_bot',
  role: 'admin',
};

/* ── Page ────────────────────────────────────── */

type ReviewMessage = {
  sender: 'customer' | 'support';
  text: string;
  time: string;
  date: string;
  replyTo?: number;
};

type ReviewSet = {
  id: string;
  title: string;
  summary: string;
  customerName: string;
  pinnedText: string;
  messages: ReviewMessage[];
};

type ScreenshotInput = {
  name: string;
  mimeType: string;
  data: string;
};

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


function GeneratedChatCanvas({ review }: { review: ReviewSet }) {
  const grouped = review.messages.reduce<Array<{ date: string; sender: ReviewMessage['sender']; messages: Array<ReviewMessage & { index: number }> }>>((groups, message, index) => {
    const previous = groups[groups.length - 1];
    if (previous && previous.date === message.date && previous.sender === message.sender) {
      previous.messages.push({ ...message, index });
    } else {
      groups.push({ date: message.date, sender: message.sender, messages: [{ ...message, index }] });
    }
    return groups;
  }, []);

  return (
    <div className="flex flex-col h-[100dvh] max-w-[430px] mx-auto relative overflow-hidden chat-bg">
      {/* ░░ Frosted glass overlay — gradual fade ░░ */}
      <div
        className="absolute top-0 left-0 w-full z-40 pointer-events-none"
        style={{
          height: '160px',
          backgroundColor: 'rgba(0,0,0, 0.6)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 85%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 85%, rgba(0,0,0,0) 100%)',
        }}
      ></div>

      {/* ░░ Floating Top — pills on top ░░ */}
      <div className="absolute top-0 left-0 w-full z-50 flex flex-col gap-2 px-2 pb-3">
        <StatusBar />
        <Header title={review.customerName || 'Customer'} subtitle={`${review.messages?.length || 0} messages`} unreadCount={154} />
        <PinnedMessage text={review.pinnedText} />
      </div>

      {/* ░░ Scrollable Chat Area ░░ */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-[8px] pt-[11.5rem] pb-[4rem] flex flex-col relative z-0">
        <div className="mt-auto flex flex-col">
          {grouped.map((group, groupIndex) => {
            const showDate = groupIndex === 0 || grouped[groupIndex - 1].date !== group.date;
            const isSent = group.sender === 'support';

            return (
              <div key={`${group.date}-${group.sender}-${groupIndex}`}>
                {showDate && <DateSeparator date={group.date} />}
                <div className={`tg-group ${isSent ? 'tg-group--out' : 'tg-group--in'}`}>
                  {!isSent && (
                    <div className="tg-group-avatar tg-group-avatar--gradient">
                      <span>{(review.customerName || 'L').slice(0, 1).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="tg-group-bubbles">
                    {group.messages.map((message, index) => {
                      const replyTarget = typeof message.replyTo === 'number' ? review.messages[message.replyTo] : undefined;
                      return (
                        <MessageBubble
                          key={`${message.text}-${message.index}`}
                          id={`g-${message.index}`}
                          text={message.text}
                          isSent={isSent}
                          time={message.time}
                          isRead
                          sender={isSent ? undefined : bot}
                          isFirst={index === 0}
                          isLast={index === group.messages.length - 1}
                          reply={replyTarget ? { name: replyTarget.sender === 'support' ? 'N' : bot.name, text: replyTarget.text } : undefined}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          <ScrollAnchor />
        </div>
      </div>

      {/* ░░ Bottom Frosted Glass Overlay ░░ */}
      <div
        className="absolute bottom-0 left-0 w-full z-40 pointer-events-none"
        style={{
          height: '60px',
          backgroundColor: 'rgba(0,0,0, 0.6)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)',
        }}
      ></div>

      {/* ░░ Floating Input Content ░░ */}
      <div className="z-50 absolute bottom-0 left-0 right-0 w-full px-[10px] pb-[10px]">
        <MessageInput />
      </div>
    </div>
  );
}

function ChatCanvas({ review }: { review?: ReviewSet | null }) {
  if (review) {
    return <GeneratedChatCanvas review={review} />;
  }

  return (
    <div className="flex flex-col h-[100dvh] max-w-[430px] mx-auto relative overflow-hidden chat-bg">

      {/* ░░ Frosted glass overlay — gradual fade ░░ */}
      <div
        className="absolute top-0 left-0 w-full z-40 pointer-events-none"
        style={{
          height: '160px',
          backgroundColor: 'rgba(0,0,0, 0.6)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 85%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 85%, rgba(0,0,0,0) 100%)',
        }}
      ></div>

      {/* ░░ Floating Top — pills on top ░░ */}
      <div className="absolute top-0 left-0 w-full z-50 flex flex-col gap-2 px-2 pb-3">
        <StatusBar />
        <Header title="Alfz" subtitle="18 messages" unreadCount={154} />
        <PinnedMessage />
      </div>

      {/* ░░ Scrollable Chat Area ░░ */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-[8px] pt-[11.5rem] pb-[4rem] flex flex-col relative z-0">
        <div className="mt-auto flex flex-col">

          {/* ═══════════════════════ June 22 ═══════════════════════ */}
          <DateSeparator date="June 22" />

          {/* Service: Topic created */}
          <ServiceMessage>
            <span className="inline-flex items-center gap-[6px]">
              <span
                className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #5CAFFA, #0e5285)' }}
              >
                <span className="text-white text-[11px] font-bold leading-none">A</span>
              </span>
              <span>
                <span className="font-medium">Alfz</span> was created
              </span>
            </span>
          </ServiceMessage>

          {/* Group IN: bot info + follow-up */}
          <div className="tg-group tg-group--in">
            <div className="tg-group-avatar tg-group-avatar--gradient">
              <span>L</span>
            </div>
            <div className="tg-group-bubbles">
              <MessageBubble
                id="m1"
                isSent={false}
                time="12:22 AM"
                sender={bot}
                isFirst
                isPinned
                richContent={
                  <span>
                    🆔 <span className="tg-link">1359404829</span>{'\n'}
                    🤑 <span className="tg-link">@alfz56</span>{'\n'}
                    👤 <code className="tg-mono">Alfz</code>{'\n'}
                    ✅ <strong className="tg-link">Telegram Premium User</strong>{'\n'}
                    🌐 <strong>Language</strong>: <code className="tg-mono">en</code>
                  </span>
                }
              />
              <MessageBubble
                id="m2"
                text="Need to talk . I want some other app .. if you can do I will pay"
                isSent={false}
                time="12:22 AM"
                sender={bot}
                isLast
              />
            </div>
          </div>

          {/* ═══════════════════════ June 23 ═══════════════════════ */}
          <DateSeparator date="June 23" />

          {/* Group OUT */}
          <div className="tg-group tg-group--out">
            <div className="tg-group-bubbles">
              <MessageBubble id="m3" text="Hello" isSent time="03:50 PM" isRead isFirst />
              <MessageBubble id="m4" text="Which app do you want?" isSent time="03:50 PM" isRead isLast />
            </div>
          </div>

          {/* ═══════════════════════ June 24 ═══════════════════════ */}
          <DateSeparator date="June 24" />

          {/* Group IN: single */}
          <div className="tg-group tg-group--in">
            <div className="tg-group-avatar tg-group-avatar--gradient">
              <span>L</span>
            </div>
            <div className="tg-group-bubbles">
              <MessageBubble
                id="m5"
                text="Can you do clone of exness app in ios ? And how much will be costing"
                isSent={false}
                time="12:05 AM"
                sender={bot}
                isFirst
                isLast
              />
            </div>
          </div>

          {/* Group OUT: 3 msgs */}
          <div className="tg-group tg-group--out">
            <div className="tg-group-bubbles">
              <MessageBubble id="m6" text="We can do it just for you (exclusive)" isSent time="01:41 AM" isRead isFirst />
              <MessageBubble id="m7" text="For a custom job like this we'll charge around 500 dollars" isSent time="01:43 AM" isRead />
              <MessageBubble id="m8" text="It wont be listed in our website" isSent time="01:43 AM" isRead isLast />
            </div>
          </div>

          {/* Group IN: single */}
          <div className="tg-group tg-group--in">
            <div className="tg-group-avatar tg-group-avatar--gradient">
              <span>L</span>
            </div>
            <div className="tg-group-bubbles">
              <MessageBubble
                id="m9"
                text="Ok perfect.. how many days it will take?"
                isSent={false}
                time="10:00 AM"
                sender={bot}
                isFirst
                isLast
              />
            </div>
          </div>

          {/* Group OUT: single */}
          <div className="tg-group tg-group--out">
            <div className="tg-group-bubbles">
              <MessageBubble id="m10" text="It will take a week approx" isSent time="02:08 PM" isRead isFirst isLast />
            </div>
          </div>

          {/* Group IN: 2 msgs */}
          <div className="tg-group tg-group--in">
            <div className="tg-group-avatar tg-group-avatar--gradient">
              <span>L</span>
            </div>
            <div className="tg-group-bubbles">
              <MessageBubble
                id="m11"
                text="Ok bro.. I will pay you"
                isSent={false}
                time="02:11 PM"
                sender={bot}
                isFirst
              />
              <MessageBubble
                id="m12"
                text="And one thing in trust wallst u must have seen there is no decimal option.. where in real it shows like 2586.56 like this"
                isSent={false}
                time="02:12 PM"
                sender={bot}
                isLast
              />
            </div>
          </div>

          {/* Group OUT: single */}
          <div className="tg-group tg-group--out">
            <div className="tg-group-bubbles">
              <MessageBubble
                id="m13"
                text={"Thank you for the feedback, we\u2019ll start working on trust and phantom soon too"}
                isSent
                time="02:13 PM"
                isRead
                isFirst
                isLast
              />
            </div>
          </div>

          {/* Group OUT: reply + follow-up */}
          <div className="tg-group tg-group--out">
            <div className="tg-group-bubbles">
              <MessageBubble
                id="m14"
                isSent
                time="02:21 PM"
                isRead
                isFirst
                reply={{ name: 'LarperWallet_bot', text: 'Ok bro.. I will pay you' }}
                richContent={
                  <span>
                    {"Sounds good\n\nSince this helps us fund the development, we\u2019ll do $250 upfront and the remaining $250 after delivery."}
                  </span>
                }
              />
              <MessageBubble
                id="m15"
                text={"Tell me which crypto you want to use and I\u2019ll send the wallet address."}
                isSent
                time="02:21 PM"
                isRead
                isLast
              />
            </div>
          </div>

          {/* ═══════════════════════ June 25 ═══════════════════════ */}
          <DateSeparator date="June 25" />

          {/* Group IN: single */}
          <div className="tg-group tg-group--in">
            <div className="tg-group-avatar tg-group-avatar--gradient">
              <span>L</span>
            </div>
            <div className="tg-group-bubbles">
              <MessageBubble id="m16" text="Trc 20" isSent={false} time="09:16 AM" sender={bot} isFirst isLast />
            </div>
          </div>

          {/* Group OUT: 2 msgs */}
          <div className="tg-group tg-group--out">
            <div className="tg-group-bubbles">
              <MessageBubble id="m17" text="TWsW6GacuyzWygx3WirKgjJVdm7fQp3pVU" isSent time="09:39 AM" isRead isFirst />
              <MessageBubble id="m18" text="Wallet address for trc20" isSent time="09:39 AM" isRead isLast />
            </div>
          </div>

          <ScrollAnchor />
        </div>
      </div>

      {/* ░░ Bottom Frosted Glass Overlay ░░ */}
      <div
        className="absolute bottom-0 left-0 w-full z-40 pointer-events-none"
        style={{
          height: '60px',
          backgroundColor: 'rgba(0,0,0, 0.6)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)',
        }}
      ></div>

      {/* ░░ Floating Input Content ░░ */}
      <div className="z-50 absolute bottom-0 left-0 right-0 w-full px-[10px] pb-[10px]">
        <MessageInput />
      </div>


    </div>
  );
}
