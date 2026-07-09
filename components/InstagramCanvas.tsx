import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Camera, Mic, Image as ImageIcon, Sticker, CirclePlus } from 'lucide-react';
import StatusBar from '@/components/StatusBar';
import ScrollAnchor from '@/components/ScrollAnchor';
import MarkerStrike from '@/components/MarkerStrike';
import { ReviewSet, ReviewMessage } from '@/lib/types';
import { DeviceId, getDevice } from '@/lib/devices';

/** Phone receiver with a small plus — Instagram's call button. */
function PhonePlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 13.4v2.4a1.6 1.6 0 0 1-1.74 1.6 15.83 15.83 0 0 1-6.9-2.45 15.6 15.6 0 0 1-4.8-4.8A15.83 15.83 0 0 1 3.1 3.24 1.6 1.6 0 0 1 4.7 1.5h2.4a1.6 1.6 0 0 1 1.6 1.38c.1.77.29 1.52.56 2.24a1.6 1.6 0 0 1-.36 1.69l-1.02 1.02a12.8 12.8 0 0 0 4.8 4.8l1.02-1.02a1.6 1.6 0 0 1 1.69-.36c.72.27 1.47.46 2.24.56A1.6 1.6 0 0 1 19 13.4z" />
      <path d="M18.5 4.5h5M21 2v5" transform="translate(-2.5 1)" />
    </svg>
  );
}

/** Six-petal swirl — Instagram's Meta AI button. */
function MetaAiIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7">
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <ellipse key={angle} cx="12" cy="7.4" rx="2.5" ry="4.4" transform={`rotate(${angle} 12 12)`} />
      ))}
    </svg>
  );
}

/** Instagram-style @handle derived from the display name. */
function deriveUsername(name: string) {
  const handle = name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
  return handle || 'user';
}

interface InstagramCanvasProps {
  review: ReviewSet;
  botAvatarInitial?: string;
  botAvatarColor?: string;
  botAvatarImage?: string;
  customerColor?: string;
  hideNames?: boolean;
  device?: DeviceId;
}

/** iOS Instagram dark-mode DM. Same .chat-bg/.chat-scroll export hooks as
 *  the Telegram canvas; solid chrome instead of floating glass pills. */
export default function InstagramCanvas({
  review,
  botAvatarInitial = 'L',
  botAvatarColor = '#E1306C',
  botAvatarImage = '',
  customerColor = '#3478F6',
  hideNames = false,
  device,
}: InstagramCanvasProps) {
  const screen = getDevice(device);
  const customerName = review.customerName || 'Customer';
  const username = deriveUsername(customerName);
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
          messages: [{ ...msg, index: idx }],
        });
      }
    });

    return result;
  }, [review.messages]);

  const lastMessage = review.messages.at(-1);

  const incomingAvatar = (
    <div className="ig-avatar" style={botAvatarImage ? {} : { background: botAvatarColor }}>
      {botAvatarImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={botAvatarImage} alt="" className="w-full h-full object-cover" />
      ) : (
        <span>{botAvatarInitial.slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );

  return (
    <div
      className="flex flex-col h-[100dvh] mx-auto relative overflow-hidden chat-bg chat-bg--instagram"
      style={{
        '--screen-w': `${screen.width}px`,
        '--screen-h': `${screen.height}px`,
        maxWidth: `${screen.width}px`,
      } as React.CSSProperties}
    >
      {/* ░░ Translucent top chrome — messages blur behind it ░░ */}
      <div className="ig-top absolute top-0 left-0 w-full z-50">
        <StatusBar time={review.statusBarTime} cutout={screen.cutout} />
        <div className="ig-header">
          <span className="ig-header__btn">
            <ChevronLeft className="size-[22px] ml-[-1px]" strokeWidth={2.4} />
          </span>
          <div className="ig-header__avatar" style={{ background: customerColor }}>
            <span>{customerName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="ig-header__meta">
            <span className="ig-header__name">
              {hideNames ? <MarkerStrike text={customerName} className="marker-strike--header" /> : customerName}
              <ChevronRight className="ig-header__name-chevron size-[14px]" strokeWidth={2.6} />
            </span>
            <span className="ig-header__status">
              {hideNames ? <MarkerStrike text={username} className="marker-strike--inline" /> : username}
            </span>
          </div>
          <div className="ig-header__actions">
            <span className="ig-header__btn">
              <PhonePlusIcon />
            </span>
            <span className="ig-header__btn">
              <MetaAiIcon />
            </span>
          </div>
        </div>
      </div>

      {/* ░░ Scrollable DM area ░░ */}
      <div className="chat-scroll flex-1 overflow-y-auto overflow-x-hidden pt-[7rem] pb-[6rem] flex flex-col relative z-0">
        <div className="mt-auto flex flex-col">
          {grouped.map((group, groupIndex) => {
            const showTimestamp = groupIndex === 0 || grouped[groupIndex - 1].date !== group.date;
            const isSent = group.sender === 'support';

            return (
              <div key={`${group.date}-${group.sender}-${groupIndex}`}>
                {showTimestamp && (
                  <div className="ig-sep">
                    {group.date}, {group.messages[0].time}
                  </div>
                )}
                <div className={`ig-group ${isSent ? 'ig-group--out' : 'ig-group--in'}`}>
                  {!isSent && incomingAvatar}
                  <div className="ig-bubbles">
                    {group.messages.map((message, index) => (
                      <div
                        key={`${message.text}-${message.index}`}
                        className={[
                          'ig-bubble',
                          isSent ? 'ig-bubble--out' : 'ig-bubble--in',
                          index === 0 ? 'ig-bubble--first' : '',
                          index === group.messages.length - 1 ? 'ig-bubble--last' : '',
                        ].filter(Boolean).join(' ')}
                      >
                        {message.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Instagram shows a read receipt under the final sent message. */}
          {lastMessage?.sender === 'support' && <div className="ig-seen">Seen</div>}

          <ScrollAnchor watch={scrollWatch} />
        </div>
      </div>

      {/* ░░ Solid bottom chrome — message composer ░░ */}
      <div className="z-50 absolute bottom-0 left-0 right-0 w-full bg-black px-[12px] pt-[6px] pb-[30px]">
        <div className="ig-inputbar">
          <span className="ig-inputbar__cam">
            <Camera className="size-[21px]" strokeWidth={2} />
          </span>
          <span className="ig-inputbar__field">Message…</span>
          <span className="ig-inputbar__icons">
            <Mic className="size-[22px]" strokeWidth={1.8} />
            <ImageIcon className="size-[22px]" strokeWidth={1.8} />
            <Sticker className="size-[22px]" strokeWidth={1.8} />
            <CirclePlus className="size-[22px]" strokeWidth={1.8} />
          </span>
        </div>
      </div>
    </div>
  );
}
