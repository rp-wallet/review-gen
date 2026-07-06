import React from 'react';
import Image from 'next/image';

export interface MessageProps {
  id: string;
  text?: string;
  richContent?: React.ReactNode;
  isSent: boolean;
  time: string;
  sender?: {
    name: string;
    role?: string;
  };
  isRead?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  isPinned?: boolean;
  reply?: {
    name: string;
    text: string;
  };
}

export default function MessageBubble({
  text,
  richContent,
  isSent,
  time,
  sender,
  isRead = true,
  isFirst = false,
  isLast = false,
  isPinned = false,
  reply,
}: MessageProps) {
  const dirClass = isSent ? 'tg-bubble--out' : 'tg-bubble--in';
  const firstClass = isFirst ? 'tg-bubble--first' : '';
  const lastClass = isLast ? 'tg-bubble--last' : '';
  const showName = isFirst && !isSent && sender;

  const timeInner = (
    <>
      {/* Pin icon for pinned messages */}
      {isPinned && !isSent && (
        <svg className="tg-time-pinned" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16.5 3.5l4 4-2.5 2.5 1 3.5-4.5 4.5-1-4.5L9 18l-1.5 1.5-1-1L8 17l4.5-4.5L8 11.5l4.5-4.5 3.5 1z" />
        </svg>
      )}
      <span>{time}</span>
      {/* Read status for outgoing */}
      {isSent && (
        isRead ? (
          /* Double check — read */
          <Image
            src="/chat-double-check.png"
            alt=""
            width={19}
            height={10}
            unoptimized
            aria-hidden="true"
            className="tg-status-image"
          />
        ) : (
          /* Single check — sent */
          <svg className="tg-status" viewBox="0 0 16 11" width="16" height="11" fill="none">
            <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.336-.153.457.457 0 0 0-.343.143.441.441 0 0 0-.14.334.44.44 0 0 0 .149.326l2.354 2.449a.462.462 0 0 0 .312.149.467.467 0 0 0 .382-.187L11.1 1.03a.445.445 0 0 0-.029-.377z" fill="currentColor"/>
          </svg>
        )
      )}
    </>
  );

  return (
    <div className={`tg-bubble ${dirClass} ${firstClass} ${lastClass}`}>
      {/* Sender name — first message in incoming group */}
      {showName && (
        <div className="tg-name">
          <span className="tg-name-title">{sender!.name}</span>
          {sender!.role && (
            <span className="tg-name-rank">{sender!.role}</span>
          )}
        </div>
      )}

      {/* Reply quote */}
      {reply && (
        <div className="tg-reply">
          <div className="tg-reply-bar" />
          <div className="tg-reply-content">
            <span className="tg-reply-name">{reply.name}</span>
            <span className="tg-reply-text">{reply.text}</span>
          </div>
        </div>
      )}

      {/* Message body */}
      <div className="tg-message">
        {richContent || text}

        {/* Invisible spacer reserving the time's width on the last line */}
        <span className="tg-time-space" aria-hidden="true">{timeInner}</span>

        {/* Time + status (absolute, bottom-right) */}
        <span className={`tg-time ${isSent ? 'tg-time--out' : 'tg-time--in'}`}>
          {timeInner}
        </span>
      </div>

      {/* Tail SVG — iOS Telegram fang, traced from Telegram-iOS bubble path.
          Overlaps the bubble's uniformly-rounded corner; fill is the shared
          fixed gradient via CSS background + mask (path kept for shape
          reference, must stay in sync with --tail-mask in globals.css). */}
      {isLast && (
        <svg
          viewBox="0 0 16 21"
          width="16"
          height="21"
          className={`tg-tail ${isSent ? 'tg-tail--out' : 'tg-tail--in'}`}
        >
          <path d="M0 0 L9.83 0 L9.83 12.33 C9.88 15.45 10.61 18.92 15.97 21 C16.03 21 6.69 20.99 3.23 16.93 Z" />
        </svg>
      )}
    </div>
  );
}
