import React, { useMemo } from 'react';
import Header from '@/components/Header';
import PinnedMessage from '@/components/PinnedMessage';
import MessageBubble from '@/components/MessageBubble';
import MessageInput from '@/components/MessageInput';
import DateSeparator from '@/components/DateSeparator';
import ScrollAnchor from '@/components/ScrollAnchor';
import StatusBar from '@/components/StatusBar';
import MosaicText from '@/components/MosaicText';
import { ReviewSet, ReviewMessage } from '@/lib/types';

interface ChatCanvasProps {
  review: ReviewSet;
  botName?: string;
  botAvatarInitial?: string;
  botAvatarColor?: string;
  botAvatarImage?: string;
  showProfileIntro?: boolean;
  blurNames?: boolean;
}

function profileIntroLines(text: string) {
  return text
    .replace(/\s+(?=[🆔🤑👤✅🌐])/gu, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function profileIntroContent(text: string, blurNames: boolean) {
  const parts = profileIntroLines(text);
  if (!blurNames) return parts.join('\n');

  return parts.map((line, index) => {
    const username = line.match(/@[A-Za-z0-9_]+/)?.[0];
    const nameLine = line.match(/^👤\s*(.+)$/u)?.[1]?.trim();

    return (
      <React.Fragment key={`${line}-${index}`}>
        {username ? (
          <>
            {line.slice(0, line.indexOf(username))}
            <MosaicText text={username} className="mosaic-text--inline" />
          </>
        ) : nameLine ? (
          <>
            👤 <MosaicText text={nameLine} className="mosaic-text--inline" />
          </>
        ) : (
          line
        )}
        {index < parts.length - 1 ? '\n' : null}
      </React.Fragment>
    );
  });
}

export default function ChatCanvas({
  review,
  botName = 'LarperWallet_bot',
  botAvatarInitial = 'L',
  botAvatarColor = '#3478F6',
  botAvatarImage = '',
  showProfileIntro = true,
  blurNames = false
}: ChatCanvasProps) {
  const bot = {
    name: botName,
    role: 'admin',
  };
  const profileText = review.pinnedText?.trim() || '';
  const showPinnedProfile = showProfileIntro && !!profileText;
  const profileDate = review.messages[0]?.date || 'June 25';
  const profileTime = review.messages[0]?.time || '09:00 AM';
  const scrollWatch = `${review.messages.length}:${review.messages.at(-1)?.text ?? ''}:${review.messages.at(-1)?.time ?? ''}`;

  const grouped = useMemo(() => {
    const result: { date: string; sender: 'customer' | 'support'; messages: (ReviewMessage & { index: number })[] }[] = [];

    review.messages.forEach((msg, idx) => {
      const lastGroup = result[result.length - 1];

      if (lastGroup && lastGroup.date === msg.date && lastGroup.sender === msg.sender) {
        lastGroup.messages.push({ ...msg, index: idx });
      } else {
        result.push({
          date: msg.date,
          sender: msg.sender as 'customer' | 'support',
          messages: [{ ...msg, index: idx }]
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
          blurName={blurNames}
        />
        {showPinnedProfile && <PinnedMessage text={profileText} blurNames={blurNames} />}
      </div>

      {/* ░░ Scrollable Chat Area ░░ */}
      <div className={`chat-scroll flex-1 overflow-y-auto overflow-x-hidden px-[8px] ${showPinnedProfile ? 'pt-[11.5rem]' : 'pt-[8.5rem]'} pb-[5.5rem] flex flex-col relative z-0`}>
        <div className="mt-auto flex flex-col">
          {showPinnedProfile && (
            <>
              <DateSeparator date={profileDate} />
              <div className="tg-group tg-group--in">
                <div
                  className="tg-group-avatar tg-group-avatar--gradient overflow-hidden"
                  style={botAvatarImage ? {} : { background: botAvatarColor }}
                >
                  {botAvatarImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={botAvatarImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{botAvatarInitial.slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div className="tg-group-bubbles">
                  <MessageBubble
                    id="profile-intro"
                    isSent={false}
                    time={profileTime}
                    isRead
                    sender={bot}
                    isFirst
                    isLast
                    richContent={(
                      <span className="whitespace-pre-wrap">
                        {profileIntroContent(profileText, blurNames)}
                      </span>
                    )}
                  />
                </div>
              </div>
            </>
          )}

          {grouped.map((group, groupIndex) => {
            const showDate = (!showPinnedProfile && groupIndex === 0) || (groupIndex > 0 && grouped[groupIndex - 1].date !== group.date);
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
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={botAvatarImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{botAvatarInitial.slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                  )}
                  <div className="tg-group-bubbles">
                    {group.messages.map((message, index) => {
                      const replyTarget = typeof message.replyTo === 'number' && message.replyTo >= 0 && message.replyTo < message.index
                        ? review.messages[message.replyTo]
                        : undefined;
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
