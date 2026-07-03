import Header from '@/components/Header';
import PinnedMessage from '@/components/PinnedMessage';
import MessageBubble from '@/components/MessageBubble';
import MessageInput from '@/components/MessageInput';
import DateSeparator from '@/components/DateSeparator';
import ServiceMessage from '@/components/ServiceMessage';
import ScrollAnchor from '@/components/ScrollAnchor';

/* ── Shared sender ──────────────────────────── */

const bot = {
  name: 'LarperWallet_bot',
  role: 'admin',
};

/* ── Page ────────────────────────────────────── */

export default function Home() {
  return (
    <div className="flex flex-col h-[100dvh] max-w-[430px] mx-auto relative overflow-hidden chat-bg">

      {/* ░░ Floating Top ░░ */}
      <div className="absolute top-0 left-0 w-full z-50 flex flex-col gap-2 p-2">
        <Header title="Alfz" subtitle="In Larper_wallet_support_team" unreadCount={154} />
        <PinnedMessage />
      </div>

      {/* ░░ Scrollable Chat Area ░░ */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden px-[8px] pt-[8rem] pb-[4rem] flex flex-col relative z-0"
        style={{
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, black 7rem, black calc(100% - 4rem), rgba(0,0,0,0.3) 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, black 7rem, black calc(100% - 4rem), rgba(0,0,0,0.3) 100%)',
        }}
      >
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

      {/* ░░ Floating Input ░░ */}
      <div className="z-50 absolute bottom-0 left-0 right-0 w-full px-[10px] pb-[10px] bg-transparent pointer-events-none">
        <div className="pointer-events-auto">
          <MessageInput />
        </div>
      </div>


    </div>
  );
}
