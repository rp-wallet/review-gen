import React from 'react';
import { ChevronLeft } from 'lucide-react';
import MarkerStrike from '@/components/MarkerStrike';

interface HeaderProps {
  title: string;
  subtitle: string;
  unreadCount?: number;
  avatarInitial?: string;
  avatarColor?: string;
  hideName?: boolean;
}

/* Top stop of the topic-icon gradient: the customer color mixed toward white. */
function lighten(hex: string, amount: number) {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  const channels = [0, 2, 4].map((i) => {
    const channel = parseInt(full.slice(i, i + 2), 16);
    return Math.round(channel + (255 - channel) * amount).toString(16).padStart(2, '0');
  });
  return `#${channels.join('')}`;
}

export default function Header({
  title = "Alfz",
  subtitle = "In Larper_wallet_support_team",
  avatarColor = '#3478F6',
  hideName = false,
}: HeaderProps) {
  const gradientId = `tg-topic-icon-grad-${avatarColor.replace('#', '')}`;
  return (
    <div
      className="flex items-center gap-[8px] w-full cursor-pointer relative text-[var(--tg-text)] shrink-0 px-1"
    >

      {/* Back button */}
      <div className='flex-1'>
        <button
          className="liquid-glass flex items-center justify-center size-[46px] rounded-full outline-none relative text-white shrink-0"
        >
          <ChevronLeft className="size-6 ml-[-2px] text-white relative z-[1]" strokeWidth={2} />
        </button>
      </div>

      {/* Center Chat Info Pill */}
      <div
        className="liquid-glass flex flex-1 flex-col min-w-[160px] justify-center items-center h-[46px] rounded-full overflow-hidden shrink-0"
      >
        <span className="relative z-[1] text-[17px] font-medium leading-[21px] text-white truncate px-4 tracking-[-0.01em]">
          {hideName ? <MarkerStrike text={title} className="marker-strike--header" /> : title}
        </span>
        <span className="relative z-[1] text-[12px] leading-[15px] text-[#dddaf1] truncate px-4 -translate-y-0.5">{subtitle}</span>
      </div>

      {/* Right Avatar Pill */}
      <div className='flex-1 flex justify-end'>
        <button
          className="liquid-glass flex items-center justify-center size-[46px] rounded-full shrink-0"
        >
          {/* Topic icon */}
          <span className="relative z-[1] w-[34px] h-[34px] flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-full h-full">
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lighten(avatarColor, 0.28)} />
                  <stop offset="100%" stopColor={avatarColor} />
                </linearGradient>
              </defs>
              <path fill={`url(#${gradientId})`} d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.5 5.43 3.82 7.07L4.5 22l4.23-2.11A10.87 10.87 0 0012 20c5.52 0 10-4.03 10-9s-4.48-9-10-9z" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-white text-[15px] font-bold pb-[2px] pr-[1px]">{title.charAt(0).toUpperCase()}</span>
          </span>
        </button>
      </div>
    </div>
  );
}
