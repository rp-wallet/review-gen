import React from 'react';

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
          <svg className="tg-status" viewBox="0 0 16 11" width="16" height="11" fill="none">
            <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.336-.153.457.457 0 0 0-.343.143.441.441 0 0 0-.14.334.44.44 0 0 0 .149.326l2.354 2.449a.462.462 0 0 0 .312.149.467.467 0 0 0 .382-.187L11.1 1.03a.445.445 0 0 0-.029-.377z" fill="currentColor"/>
            <path d="M14.757.653a.457.457 0 0 0-.305-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.2-1.25-.313.39 1.166 1.212a.462.462 0 0 0 .312.15.467.467 0 0 0 .382-.188L14.786 1.03a.445.445 0 0 0-.03-.377z" fill="currentColor"/>
          </svg>
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

      {/* Tail SVG — exact Telegram #message-tail-filled. Fill is the shared
          fixed gradient via CSS background + mask (path kept for shape). */}
      {isLast && (
        <svg
          viewBox="0 0 11 20"
          width="11"
          height="20"
          className={`tg-tail ${isSent ? 'tg-tail--out' : 'tg-tail--in'}`}
        >
          <g transform="translate(9 -14)" fillRule="evenodd">
            <path
              d="M-6 16h6v17c-.193-2.84-.876-5.767-2.05-8.782-.904-2.325-2.446-4.485-4.625-6.48A1 1 0 01-6 16z"
              transform="matrix(1 0 0 -1 0 49)"
            />
          </g>
        </svg>
      )}
    </div>
  );
}
