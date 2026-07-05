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

export default function Header({
  title = "Alfz",
  subtitle = "In Larper_wallet_support_team",
  hideName = false,
}: HeaderProps) {
  return (
    <div
      className="flex items-center gap-[8px] w-full cursor-pointer relative text-[var(--tg-text)] shrink-0 px-1"
    >

      {/* Back button */}
      <div className='flex-1'>
        <button
          className="liquid-glass flex items-center justify-center size-[42px] rounded-full outline-none cursor-pointer relative text-white transition-transform duration-200 active:scale-95 shrink-0"
        >
          <ChevronLeft className="size-6 ml-[-2px] text-white relative z-[1]" strokeWidth={2} />
        </button>
      </div>

      {/* Center Chat Info Pill */}
      <div
        className="liquid-glass flex flex-1 flex-col min-w-[160px] justify-center items-center h-[42px] rounded-full overflow-hidden shrink-0"
      >
        <span className="relative z-[1] text-[15.5px] font-medium leading-[20px] text-white truncate px-4 tracking-[-0.01em]">
          {hideName ? <MarkerStrike text={title} className="marker-strike--header" /> : title}
        </span>
        <span className="relative z-[1] text-[12px] leading-[15px] text-[#dddaf1] truncate px-4 -translate-y-0.5">{subtitle}</span>
      </div>

      {/* Right Avatar Pill */}
      <div className='flex-1 flex justify-end'>
        <button
          className="liquid-glass flex items-center justify-center size-[42px] rounded-full shrink-0 transition-transform duration-200 active:scale-95"
        >
          {/* Topic icon */}
          <span className="relative z-[1] w-[28px] h-[28px] flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-full h-full text-[#3478F6]" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.5 5.43 3.82 7.07L4.5 22l4.23-2.11A10.87 10.87 0 0012 20c5.52 0 10-4.03 10-9s-4.48-9-10-9z" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-white text-[13px] font-bold pb-[2px] pr-[1px]">{title.charAt(0).toUpperCase()}</span>
          </span>
        </button>
      </div>
    </div>
  );
}
