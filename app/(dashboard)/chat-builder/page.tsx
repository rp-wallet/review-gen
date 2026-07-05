'use client';

import { useEffect, useRef, useState } from 'react';
import { ReviewSet, ReviewMessage } from '@/lib/types';
import PhonePreview from '@/components/PhonePreview';
import WorkspaceHeader from '@/components/WorkspaceHeader';
import { exportChatScreenshot } from '@/lib/export-screenshot';
import { cn } from '@/lib/utils';
import {
  Bot,
  Plus,
  Trash2,
  Pin,
  User,
  ImagePlus,
  GripVertical,
  Download,
  Loader2,
  PencilLine,
  RotateCcw,
} from 'lucide-react';

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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const BUILDER_IMPORT_KEY = 'reviewmockup:builder-import';

type BuilderImport = {
  review?: ReviewSet;
  botName?: string;
  botAvatarInitial?: string;
  botAvatarColor?: string;
  botAvatarImage?: string;
  showProfileIntro?: boolean;
};

function cleanMessages(messages: ReviewMessage[]) {
  return messages.map((message) => {
    const next = { ...message };
    delete next.replyTo;
    return next;
  });
}

export default function ChatBuilderPage() {
  const [customerName, setCustomerName] = useState('Marketing Pro');
  const [avatarInitial, setAvatarInitial] = useState('M');
  const [avatarColor, setAvatarColor] = useState('#3478F6');
  const [pinnedText, setPinnedText] = useState('🆔 998877665 🤑 @marketing_pro 👤 Marketing Pro ✅ Pro Plan 🌐 Language: en');
  const [showProfileIntro, setShowProfileIntro] = useState(true);

  const [botName, setBotName] = useState('ReviewMockupBot');
  const [botAvatarInitial, setBotAvatarInitial] = useState('R');
  const [botAvatarColor, setBotAvatarColor] = useState('#8774e1');
  const [botAvatarImage, setBotAvatarImage] = useState<string>('');

  const [messages, setMessages] = useState<ReviewMessage[]>([
    { sender: 'customer', text: "Welcome to ReviewMockup! 👋 I'm here to show you how to build realistic, beautiful Telegram chat mockups in seconds.", time: '09:00 AM', date: 'Oct 12' },
    { sender: 'support', text: "That sounds awesome! We definitely need better visuals for our landing page. How does it work?", time: '09:02 AM', date: 'Oct 12' },
    { sender: 'customer', text: "It's super easy! Click any message in the Conversation list on the left to edit it in the panel on the right.", time: '09:03 AM', date: 'Oct 12' },
    { sender: 'support', text: "Yes, I see it.", time: '09:03 AM', date: 'Oct 12' },
    { sender: 'customer', text: "You can use it to completely customize the appearance of the bot and the user. Try changing my name or avatar color!", time: '09:04 AM', date: 'Oct 12' },
    { sender: 'customer', text: "You can also upload a custom image for the bot avatar to make it match your brand perfectly.", time: '09:05 AM', date: 'Oct 12' },
    { sender: 'support', text: "Oh wow, that's really convenient. What about the 'Pinned Message' setting?", time: '09:07 AM', date: 'Oct 12' },
    { sender: 'customer', text: "Great question! That lets you customize the pinned message bar at the very top of the chat.", time: '09:08 AM', date: 'Oct 12' },
    { sender: 'customer', text: "It also automatically injects a rich profile summary into the very first message you send, which is a common pattern for Telegram bots.", time: '09:08 AM', date: 'Oct 12' },
    { sender: 'support', text: "Ah, I noticed that at the top of this chat. That makes it look super authentic.", time: '09:09 AM', date: 'Oct 12' },
    { sender: 'support', text: "So how do I actually build the conversation?", time: '09:10 AM', date: 'Oct 12' },
    { sender: 'customer', text: "Use the Conversation list — add as many messages as you want, and drag rows to reorder them.", time: '09:11 AM', date: 'Oct 12' },
    { sender: 'customer', text: "For each message, you can easily toggle whether it was sent by the Bot (incoming, on the left) or the User (outgoing, on the right).", time: '09:12 AM', date: 'Oct 12' },
    { sender: 'support', text: "Let me guess... I can also adjust the timestamps?", time: '09:15 AM', date: 'Oct 12' },
    { sender: 'customer', text: "Exactly! You can tweak the time for every single message. You can even add date separators.", time: '09:16 AM', date: 'Oct 12' },
    { sender: 'support', text: "This is so much better than trying to manually edit HTML or piece together screenshots in Figma.", time: '09:20 AM', date: 'Oct 12' },
    { sender: 'customer', text: "That's exactly why we built ReviewMockup! It saves hours of design time.", time: '09:22 AM', date: 'Oct 12' },
    { sender: 'support', text: "Once I have the perfect conversation built out, how do I export it?", time: '09:25 AM', date: 'Oct 12' },
    { sender: 'customer', text: "It's all rendered live in the Phone Preview canvas in the center of your screen.", time: '09:26 AM', date: 'Oct 12' },
    { sender: 'customer', text: "We've carefully designed the preview to mimic a native iOS Telegram experience.", time: '09:26 AM', date: 'Oct 12' },
    { sender: 'customer', text: "It features authentic styling, exact Apple UI proportions, and even the new glassmorphic aesthetics!", time: '09:27 AM', date: 'Oct 12' },
    { sender: 'support', text: "It really looks identical to my phone. I can just hit 'Export screenshot' at the top and drop it straight into our marketing materials.", time: '09:30 AM', date: 'Oct 12' },
    { sender: 'customer', text: "Spot on! 🎯 You can capture the entire phone frame for a beautiful, realistic showcase of your product.", time: '09:32 AM', date: 'Oct 12' },
    { sender: 'support', text: "Alright, I'm sold. I'm going to clear these messages and start building my first mockup right now!", time: '09:35 AM', date: 'Oct 12' },
    { sender: 'customer', text: "Have fun! Just click the Trash icons to remove these demo messages, and hit 'Add message' to start fresh.", time: '09:36 AM', date: 'Oct 12' },
  ]);

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const previewHostRef = useRef<HTMLDivElement | null>(null);

  const selected = selectedIdx !== null ? messages[selectedIdx] : null;

  useEffect(() => {
    const raw = window.localStorage.getItem(BUILDER_IMPORT_KEY);
    if (!raw) return;

    let timeout: number | undefined;
    try {
      const payload = JSON.parse(raw) as BuilderImport;
      const imported = payload.review;
      if (!imported?.messages?.length) return;

      timeout = window.setTimeout(() => {
        setCustomerName(imported.customerName || 'Customer');
        setAvatarInitial((imported.customerName || 'C').slice(0, 1).toUpperCase());
        setPinnedText(imported.pinnedText || '');
        setShowProfileIntro(Boolean(payload.showProfileIntro && imported.pinnedText));
        setBotName(payload.botName || 'ReviewMockupBot');
        setBotAvatarInitial(payload.botAvatarInitial || 'R');
        setBotAvatarColor(payload.botAvatarColor || '#8774e1');
        setBotAvatarImage(payload.botAvatarImage || '');
        setMessages(cleanMessages(imported.messages));
        setSelectedIdx(null);
        setDragIdx(null);
      }, 0);
    } catch (error) {
      console.error('Unable to import review into chat builder', error);
    } finally {
      window.localStorage.removeItem(BUILDER_IMPORT_KEY);
    }

    return () => {
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, []);

  const handleBotAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setBotAvatarImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addMessage = () => {
    setMessages([
      ...messages,
      { sender: 'customer', text: '', time: '12:00 PM', date: 'June 25', isPinned: false },
    ]);
    setSelectedIdx(messages.length);
  };

  const resetConversation = () => {
    setMessages([]);
    setSelectedIdx(null);
    setDragIdx(null);
  };

  const updateMessage = (index: number, field: keyof ReviewMessage, value: string | boolean) => {
    const newMessages = [...messages];
    newMessages[index] = { ...newMessages[index], [field]: value as never };
    setMessages(newMessages);
  };

  const removeMessage = (index: number) => {
    setMessages(messages.filter((_, i) => i !== index));
    setSelectedIdx((prev) => {
      if (prev === null) return null;
      if (prev === index) return null;
      return prev > index ? prev - 1 : prev;
    });
  };

  const moveMessage = (from: number, to: number) => {
    setMessages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setSelectedIdx((prev) => {
      if (prev === null) return null;
      if (prev === from) return to;
      if (from < to && prev > from && prev <= to) return prev - 1;
      if (from > to && prev >= to && prev < from) return prev + 1;
      return prev;
    });
  };

  const handleRowDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === index) return;
    moveMessage(dragIdx, index);
    setDragIdx(index);
  };

  const handleExport = async () => {
    const node = previewHostRef.current?.querySelector<HTMLElement>('.chat-bg');
    if (!node) return;
    setExporting(true);
    try {
      await exportChatScreenshot(node, customerName || 'chat');
    } catch (error) {
      console.error('Unable to export screenshot', error);
    } finally {
      setExporting(false);
    }
  };

  const mockReview: ReviewSet = {
    id: 'preview',
    title: 'Preview',
    summary: 'Preview',
    customerName,
    pinnedText,
    messages,
  };

  return (
    <div className="workspace">
      <WorkspaceHeader
        title="Chat Builder"
        subtitle="Create beautiful chat screenshots in seconds"
        meta={`${messages.length} messages`}
      >
        <Button variant="brand" onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 className="animate-spin" /> : <Download />}
          {exporting ? 'Rendering…' : 'Export screenshot'}
        </Button>
      </WorkspaceHeader>

      <div className="workspace-grid workspace-grid--builder">
        {/* ── Conversation list ──────────────────────────────────── */}
        <section className="dashboard-messages">
          <div className="panel-head">
            <div>
              <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground">
                Conversation
              </h2>
              <p className="text-[12px] text-muted-foreground">Drag to reorder · click to edit</p>
            </div>
            <Button variant="brand" size="sm" onClick={addMessage}>
              <Plus size={15} /> Add message
            </Button>
          </div>

          <div
            className="panel-scroll"
            onScroll={(e) => {
              const t = e.currentTarget;
              const isBottom = Math.abs(t.scrollHeight - t.scrollTop - t.clientHeight) < 2;
              t.classList.toggle('is-bottom', isBottom);
            }}
          >
          <div className="msg-list">
            {messages.map((msg, idx) => {
              const incoming = msg.sender === 'customer';
              return (
                <div
                  key={idx}
                  role="button"
                  tabIndex={0}
                  draggable
                  onClick={() => setSelectedIdx(idx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedIdx(idx);
                    }
                  }}
                  onDragStart={() => setDragIdx(idx)}
                  onDragOver={(e) => handleRowDragOver(e, idx)}
                  onDragEnd={() => setDragIdx(null)}
                  className={cn(
                    'msg-row',
                    selectedIdx === idx && 'is-active',
                    dragIdx === idx && 'is-dragging'
                  )}
                >
                  <GripVertical size={14} className="msg-row__grip" />
                  {incoming && botAvatarImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={botAvatarImage} alt="" className="msg-row__avatar object-cover" />
                  ) : (
                    <span
                      className="msg-row__avatar"
                      style={{ background: incoming ? botAvatarColor : avatarColor }}
                    >
                      {incoming ? botAvatarInitial : avatarInitial}
                    </span>
                  )}
                  <div className="msg-row__body">
                    <div className="msg-row__top">
                      <span className="msg-row__kind">
                        {incoming ? 'Incoming' : 'Outgoing'}
                        <span className="text-muted-foreground font-normal">
                          {' '}· {incoming ? botName || 'Bot' : 'User'}
                        </span>
                      </span>
                      <span className="msg-row__time">{msg.time}</span>
                    </div>
                    <p className={cn('msg-row__text', !msg.text && 'is-empty')}>
                      {msg.text || 'Empty message'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete message"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeMessage(idx);
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              );
            })}
          </div>
          </div>
        </section>

        {/* ── Preview (center) ───────────────────────────────────── */}
        <PhonePreview
          review={mockReview}
          botName={botName}
          botAvatarInitial={botAvatarInitial}
          botAvatarColor={botAvatarColor}
          botAvatarImage={botAvatarImage}
          showProfileIntro={showProfileIntro}
          downloadName={customerName || 'chat'}
          hideCta
          hostRef={previewHostRef}
        />

        {/* ── Edit panel ─────────────────────────────────────────── */}
        <aside className="dashboard-sidebar">
          <div className="panel-head">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
                {selected ? 'Edit message' : 'Chat settings'}
              </h2>
              <p className="text-[12px] text-muted-foreground">
                {selected ? `Message #${(selectedIdx ?? 0) + 1}` : 'Applies to the whole chat'}
              </p>
            </div>
            {selected && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Delete message"
                onClick={() => removeMessage(selectedIdx!)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={15} />
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
          <div className="flex flex-col gap-4">
            {selected ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PencilLine size={14} className="text-brand" />
                    Message
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 pt-0">
                  <div className="flex flex-col gap-2">
                    <Label>Type</Label>
                    <Select
                      value={selected.sender}
                      onValueChange={(v) => updateMessage(selectedIdx!, 'sender', v)}
                    >
                      <SelectTrigger size="sm" aria-label="Sender">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">Bot · Incoming</SelectItem>
                        <SelectItem value="support">User · Outgoing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="edit-text">Message text</Label>
                    <Textarea
                      id="edit-text"
                      className="min-h-28"
                      value={selected.text}
                      onChange={(e) => updateMessage(selectedIdx!, 'text', e.target.value)}
                      placeholder="Type message text…"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="edit-time">Time</Label>
                      <Input
                        id="edit-time"
                        className="text-center font-mono text-[13px]"
                        value={selected.time}
                        onChange={(e) => updateMessage(selectedIdx!, 'time', e.target.value)}
                        placeholder="12:00 PM"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="edit-date">Date</Label>
                      <Input
                        id="edit-date"
                        value={selected.date}
                        onChange={(e) => updateMessage(selectedIdx!, 'date', e.target.value)}
                        placeholder="June 25"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-8 text-center">
                <PencilLine size={20} className="text-muted-foreground" />
                <p className="px-6 text-[12.5px] text-muted-foreground">
                  Select a message in the Conversation list to edit it here.
                </p>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User size={14} className="text-muted-foreground" />
                  Customer
                </CardTitle>
                <CardDescription>Shown in the chat header</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 pt-0">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="cust-name">Name</Label>
                  <Input id="cust-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="cust-initial">Avatar initial</Label>
                    <Input id="cust-initial" className="text-center" value={avatarInitial} maxLength={2} onChange={(e) => setAvatarInitial(e.target.value)} />
                  </div>
                  <div className="flex w-20 flex-col gap-2">
                    <Label htmlFor="cust-color">Color</Label>
                    <input id="cust-color" type="color" className="dash-color" value={avatarColor} onChange={(e) => setAvatarColor(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot size={14} className="text-brand" />
                  Bot
                </CardTitle>
                <CardDescription>The automated sender on the left</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 pt-0">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="bot-name">Name</Label>
                  <Input id="bot-name" value={botName} onChange={(e) => setBotName(e.target.value)} />
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="bot-initial">Avatar initial</Label>
                    <Input id="bot-initial" className="text-center" value={botAvatarInitial} maxLength={2} onChange={(e) => setBotAvatarInitial(e.target.value)} />
                  </div>
                  <div className="flex w-20 flex-col gap-2">
                    <Label htmlFor="bot-color">Color</Label>
                    <input id="bot-color" type="color" className="dash-color" value={botAvatarColor} onChange={(e) => setBotAvatarColor(e.target.value)} />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Display picture</Label>
                  <div className="flex items-center gap-3">
                    {botAvatarImage && (
                      <div className="group relative size-10 shrink-0 overflow-hidden rounded-full border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={botAvatarImage} alt="Bot avatar" className="size-full object-cover" />
                        <button
                          type="button"
                          aria-label="Remove image"
                          onClick={() => setBotAvatarImage('')}
                          className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100"
                        >
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pin size={14} className="text-muted-foreground" />
                  Pinned message
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 pt-0">
                <label htmlFor="profile-intro" className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="text-[13px] text-foreground">Pinned chat</span>
                  <Switch id="profile-intro" checked={showProfileIntro} onCheckedChange={setShowProfileIntro} />
                </label>
                <Separator />
                <div className="flex flex-col gap-2">
                  <Label htmlFor="pinned-text">Pinned profile text</Label>
                  <Textarea
                    id="pinned-text"
                    className="min-h-16"
                    value={pinnedText}
                    onChange={(e) => setPinnedText(e.target.value)}
                    disabled={!showProfileIntro}
                  />
                </div>
              </CardContent>
            </Card>

            {!selected && (
              <Button
                variant="destructive"
                size="lg"
                onClick={resetConversation}
                disabled={!messages.length}
                className="w-full border-red-200/15 bg-red-500/18 text-red-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_22px_-14px_rgba(255,80,80,0.8)] hover:bg-red-500/24 hover:text-white"
              >
                <RotateCcw size={15} />
                Reset
              </Button>
            )}
          </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
