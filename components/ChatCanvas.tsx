import React, { useMemo } from 'react';
import Header from '@/components/Header';
import PinnedMessage from '@/components/PinnedMessage';
import MessageBubble from '@/components/MessageBubble';
import MessageInput from '@/components/MessageInput';
import DateSeparator from '@/components/DateSeparator';
import ServiceMessage from '@/components/ServiceMessage';
import ScrollAnchor from '@/components/ScrollAnchor';
import StatusBar from '@/components/StatusBar';
import { ReviewSet, ReviewMessage } from '@/lib/types';

interface ChatCanvasProps {
  review: ReviewSet;
  botName?: string;
  botAvatarInitial?: string;
  botAvatarColor?: string;
  botAvatarImage?: string;
  showProfileIntro?: boolean;
}

export default function ChatCanvas({
  review,
  botName = 'LarperWallet_bot',
  botAvatarInitial = 'L',
  botAvatarColor = '#3478F6',
  botAvatarImage = '',
  showProfileIntro = true
}: ChatCanvasProps) {
  const bot = {
    name: botName,
    role: 'admin',
  };
  const scrollWatch = `${review.messages.length}:${review.messages.at(-1)?.text ?? ''}:${review.messages.at(-1)?.time ?? ''}`;

  const grouped = useMemo(() => {
    // Find the absolute index of the first bot message
    const firstBotMessageIndex = review.messages.findIndex(m => m.sender === 'customer');

    const result: { date: string; sender: 'customer' | 'support'; messages: (ReviewMessage & { index: number, isFirstBotMessage: boolean })[] }[] = [];

    review.messages.forEach((msg, idx) => {
      const isFirstBotMessage = idx === firstBotMessageIndex;
      const lastGroup = result[result.length - 1];

      if (lastGroup && lastGroup.date === msg.date && lastGroup.sender === msg.sender) {
        lastGroup.messages.push({ ...msg, index: idx, isFirstBotMessage });
      } else {
        result.push({
          date: msg.date,
          sender: msg.sender as 'customer' | 'support',
          messages: [{ ...msg, index: idx, isFirstBotMessage }]
        });
      }
    });

    return result;
  }, [review.messages]);

  return (
    <div className="flex flex-col h-[100dvh] max-w-[430px] mx-auto relative overflow-hidden chat-bg">
      {/* ░░ Frosted glass overlay — gradual fade ░░ */}
      <div
        className="chat-glass chat-glass--top absolute top-0 left-0 w-full z-40 pointer-events-none"
        style={{
          height: '160px',
          backgroundColor: 'rgba(0,0,0, 0.55)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 85%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 85%, rgba(0,0,0,0) 100%)',
        }}
      ></div>

      {/* ░░ Floating Top — pills on top ░░ */}
      <div className="absolute top-0 left-0 w-full z-50 flex flex-col gap-2 px-2 pb-3">
        <StatusBar />
        <Header
          title={review.customerName || 'Customer'}
          subtitle={`${review.messages?.length || 0} messages`}
        />
        <PinnedMessage text={review.pinnedText} />
      </div>

      {/* ░░ Scrollable Chat Area ░░ */}
      <div className="chat-scroll flex-1 overflow-y-auto overflow-x-hidden px-[8px] pt-[11.5rem] pb-[5.5rem] flex flex-col relative z-0">
        <div className="mt-auto flex flex-col">
          {/* {grouped.length > 0 && <ServiceMessage>
            <span className="inline-flex items-center gap-[6px]">
              <span
                className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full flex-shrink-0 text-white text-[11px] font-bold leading-none overflow-hidden"
                style={botAvatarImage ? {} : { background: botAvatarColor }}
              >
                {botAvatarImage ? (
                  <img src={botAvatarImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  botAvatarInitial.slice(0, 2).toUpperCase()
                )}
              </span>
              <span>
                <span className="font-medium">{review.customerName || 'Customer'}</span> was created
              </span>
            </span>
          </ServiceMessage>} */}

          {grouped.map((group, groupIndex) => {
            const showDate = groupIndex === 0 || grouped[groupIndex - 1].date !== group.date;
            const isSent = group.sender === 'support';

            return (
              <div key={`${group.date}-${group.sender}-${groupIndex}`}>
                {showDate && <DateSeparator date={group.date} />}
                <div className={`tg-group ${isSent ? 'tg-group--out' : 'tg-group--in'}`}>
                  {!isSent && (
                    <div
                      className="tg-group-avatar tg-group-avatar--gradient overflow-hidden"
                      style={botAvatarImage ? {} : { background: botAvatarColor }}
                    >
                      {botAvatarImage ? (
                        <img src={botAvatarImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{botAvatarInitial.slice(0, 1).toUpperCase()}</span>
                      )}
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
                          richContent={(showProfileIntro && message.isFirstBotMessage) ? (
                            <span>
                              🆔 <span className="tg-link">1359404829</span>{'\n'}
                              🤑 <span className="tg-link">@{(review.customerName || 'customer').toLowerCase()}</span>{'\n'}
                              👤 <code className="tg-mono">{review.customerName || 'Customer'}</code>{'\n'}
                              ✅ <strong className="tg-link">Telegram Premium User</strong>{'\n'}
                              🌐 <strong>Language</strong>: <code className="tg-mono">en</code>
                            </span>
                          ) : undefined}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          <ScrollAnchor watch={scrollWatch} />
        </div>
      </div>

      {/* ░░ Bottom Frosted Glass Overlay ░░ */}
      <div
        className="chat-glass chat-glass--bottom absolute bottom-0 left-0 w-full z-40 pointer-events-none"
        style={{
          height: '85px',
          backgroundColor: 'rgba(0,0,0, 0.55)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)',
        }}
      ></div>

      {/* ░░ Floating Input Content ░░ */}
      <div className="z-50 absolute bottom-0 left-0 right-0 w-full px-[10px] pb-[36px]">
        <MessageInput />
      </div>
    </div>
  );
}
