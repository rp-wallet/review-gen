'use client';

import { useState } from 'react';
import { ReviewSet, ReviewMessage } from '@/lib/types';
import PhonePreview from '@/components/PhonePreview';
import {
  Bot,
  MessagesSquare,
  Plus,
  Trash2,
  Pin,
  User,
  ImagePlus,
  ArrowLeftRight,
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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ChatBuilderPage() {
  const [customerName, setCustomerName] = useState('Marketing Pro');
  const [avatarInitial, setAvatarInitial] = useState('M');
  const [avatarColor, setAvatarColor] = useState('#3478F6');
  const [pinnedText, setPinnedText] = useState('🆔 998877665 🤑 @marketing_pro 👤 Marketing Pro ✅ Pro Plan 🌐 Language: en');
  const [showProfileIntro, setShowProfileIntro] = useState(true);

  const [botName, setBotName] = useState('ReviewGenBot');
  const [botAvatarInitial, setBotAvatarInitial] = useState('R');
  const [botAvatarColor, setBotAvatarColor] = useState('#8774e1');
  const [botAvatarImage, setBotAvatarImage] = useState<string>('');

  const [messages, setMessages] = useState<ReviewMessage[]>([
    { sender: 'customer', text: '', time: '09:00 AM', date: 'Oct 12' },
    { sender: 'customer', text: "Welcome to ReviewGen! 👋 I'm here to show you how to build realistic, beautiful Telegram chat mockups in seconds.", time: '09:00 AM', date: 'Oct 12' },
    { sender: 'support', text: "That sounds awesome! We definitely need better visuals for our landing page. How does it work?", time: '09:02 AM', date: 'Oct 12' },
    { sender: 'customer', text: "It's super easy! See that Settings Panel on the left side of your screen?", time: '09:03 AM', date: 'Oct 12' },
    { sender: 'support', text: "Yes, I see it.", time: '09:03 AM', date: 'Oct 12' },
    { sender: 'customer', text: "You can use it to completely customize the appearance of the bot and the user. Try changing my name or avatar color!", time: '09:04 AM', date: 'Oct 12' },
    { sender: 'customer', text: "You can also upload a custom image for the bot avatar to make it match your brand perfectly.", time: '09:05 AM', date: 'Oct 12' },
    { sender: 'support', text: "Oh wow, that's really convenient. What about the 'Pinned Message' setting?", time: '09:07 AM', date: 'Oct 12' },
    { sender: 'customer', text: "Great question! That lets you customize the pinned message bar at the very top of the chat.", time: '09:08 AM', date: 'Oct 12' },
    { sender: 'customer', text: "It also automatically injects a rich profile summary into the very first message you send, which is a common pattern for Telegram bots.", time: '09:08 AM', date: 'Oct 12' },
    { sender: 'support', text: "Ah, I noticed that at the top of this chat. That makes it look super authentic.", time: '09:09 AM', date: 'Oct 12' },
    { sender: 'support', text: "So how do I actually build the conversation?", time: '09:10 AM', date: 'Oct 12' },
    { sender: 'customer', text: "Right below the Global Settings, you'll find the Conversation Flow builder.", time: '09:11 AM', date: 'Oct 12' },
    { sender: 'customer', text: "You can add as many messages as you want, just like this one.", time: '09:12 AM', date: 'Oct 12' },
    { sender: 'customer', text: "For each message, you can easily toggle whether it was sent by the Bot (incoming, on the left) or the User (outgoing, on the right).", time: '09:12 AM', date: 'Oct 12' },
    { sender: 'support', text: "Let me guess... I can also adjust the timestamps?", time: '09:15 AM', date: 'Oct 12' },
    { sender: 'customer', text: "Exactly! You can tweak the time for every single message. You can even add date separators.", time: '09:16 AM', date: 'Oct 12' },
    { sender: 'support', text: "This is so much better than trying to manually edit HTML or piece together screenshots in Figma.", time: '09:20 AM', date: 'Oct 12' },
    { sender: 'customer', text: "That's exactly why we built ReviewGen! It saves hours of design time.", time: '09:22 AM', date: 'Oct 12' },
    { sender: 'support', text: "Once I have the perfect conversation built out, how do I export it?", time: '09:25 AM', date: 'Oct 12' },
    { sender: 'customer', text: "It's all rendered live in the Phone Preview canvas on the right side of your screen.", time: '09:26 AM', date: 'Oct 12' },
    { sender: 'customer', text: "We've carefully designed the preview to mimic a native iOS Telegram experience.", time: '09:26 AM', date: 'Oct 12' },
    { sender: 'customer', text: "It features authentic styling, exact Apple UI proportions, and even the new glassmorphic aesthetics!", time: '09:27 AM', date: 'Oct 12' },
    { sender: 'support', text: "It really looks identical to my phone. I can just take a screenshot of that canvas and drop it straight into our marketing materials.", time: '09:30 AM', date: 'Oct 12' },
    { sender: 'customer', text: "Spot on! 🎯 You can capture the entire phone frame for a beautiful, realistic showcase of your product.", time: '09:32 AM', date: 'Oct 12' },
    { sender: 'support', text: "Alright, I'm sold. I'm going to clear these messages and start building my first mockup right now!", time: '09:35 AM', date: 'Oct 12' },
    { sender: 'customer', text: "Have fun! Just click the Trash icons to remove these demo messages, and hit 'Add Message' to start fresh.", time: '09:36 AM', date: 'Oct 12' },
  ]);

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
  };

  const updateMessage = (index: number, field: keyof ReviewMessage, value: string | boolean) => {
    const newMessages = [...messages];
    newMessages[index] = { ...newMessages[index], [field]: value as never };
    setMessages(newMessages);
  };

  const removeMessage = (index: number) => {
    setMessages(messages.filter((_, i) => i !== index));
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
    <div className="workspace-grid">
      {/* ── Settings ─────────────────────────────────────────────── */}
      <aside className="dashboard-sidebar flex flex-col">
        <div className="dash-sticky-head flex items-center gap-3">
          <div className="dashboard-logo flex items-center justify-center bg-gradient-to-br from-brand to-[#6a54d6] shadow-[0_4px_14px_-4px_rgba(139,123,240,0.7)]">
            <Bot size={19} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold tracking-tight text-foreground">Chat Builder</h1>
            <p className="truncate text-[12px] text-muted-foreground">Configure the mock conversation</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-4">
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
                <span className="text-[13px] text-foreground">Rich profile intro</span>
                <Switch id="profile-intro" checked={showProfileIntro} onCheckedChange={setShowProfileIntro} />
              </label>
              <Separator />
              <div className="flex flex-col gap-2">
                <Label htmlFor="pinned-text">Top bar text</Label>
                <Textarea id="pinned-text" className="min-h-16" value={pinnedText} onChange={(e) => setPinnedText(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </div>
      </aside>

      {/* ── Conversation ─────────────────────────────────────────── */}
      <section className="dashboard-messages flex flex-col">
        <div className="dash-sticky-head flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-secondary">
              <MessagesSquare size={16} className="text-muted-foreground" />
            </div>
            <div>
              <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground">
                Conversation
                <Badge variant="muted">{messages.length}</Badge>
              </h2>
              <p className="text-[12px] text-muted-foreground">Build the message flow</p>
            </div>
          </div>
          <Button variant="brand" size="sm" onClick={addMessage}>
            <Plus size={15} /> Add message
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 pt-4 2xl:grid-cols-2">
          {messages.map((msg, idx) => (
            <Card key={idx} className="group relative gap-0">
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                  <Badge variant={msg.sender === 'support' ? 'brand' : 'default'}>
                    <ArrowLeftRight size={11} />
                    {msg.sender === 'support' ? 'Outgoing' : 'Incoming'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete message"
                    onClick={() => removeMessage(idx)}
                    className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Select value={msg.sender} onValueChange={(v) => updateMessage(idx, 'sender', v)}>
                    <SelectTrigger size="sm" aria-label="Sender">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Bot · Incoming</SelectItem>
                      <SelectItem value="support">User · Outgoing</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    aria-label="Time"
                    className="h-8 w-24 text-center font-mono text-[13px]"
                    value={msg.time}
                    onChange={(e) => updateMessage(idx, 'time', e.target.value)}
                    placeholder="12:00 PM"
                  />
                </div>

                <Textarea
                  aria-label="Message text"
                  className="min-h-20"
                  value={msg.text}
                  onChange={(e) => updateMessage(idx, 'text', e.target.value)}
                  placeholder="Type message text…"
                />

                <Input
                  aria-label="Date separator"
                  className="h-8 border-transparent bg-transparent px-0 text-[12px] text-muted-foreground shadow-none hover:border-transparent focus-visible:border-transparent focus-visible:ring-0"
                  value={msg.date}
                  onChange={(e) => updateMessage(idx, 'date', e.target.value)}
                  placeholder="Date (e.g. June 25)"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Preview ──────────────────────────────────────────────── */}
      <PhonePreview
        review={mockReview}
        botName={botName}
        botAvatarInitial={botAvatarInitial}
        botAvatarColor={botAvatarColor}
        botAvatarImage={botAvatarImage}
        showProfileIntro={showProfileIntro}
        downloadName={customerName || 'chat'}
      />
    </div>
  );
}
