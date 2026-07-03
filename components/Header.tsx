import React from 'react';
import { MoreVertical, ArrowLeft } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle: string;
  unreadCount?: number;
}

export default function Header({ title = "Alfz", subtitle = "In Larper_wallet_support_team", unreadCount = 154 }: HeaderProps) {
  return (
    <div
      className="flex items-center gap-2 w-full cursor-pointer relative text-[var(--tg-text)] shrink-0"
      style={{
        height: '48px',
        borderRadius: '24px',
        backgroundColor: '#212121',
        boxShadow: '0px 1px 5px -1px rgba(0, 0, 0, .21)',
        paddingLeft: '4px',
        paddingRight: '4px',
        zIndex: 2,
      }}
    >

      {/* Back button */}
      <button className="flex items-center justify-center w-10 h-10 rounded-full border-0 bg-transparent outline-none cursor-pointer relative text-[var(--tg-text-secondary)] transition-colors duration-200 shrink-0 hover:bg-white/8 mr-[2px]">
        <ArrowLeft className="w-6 h-6 text-[#aaaaaa]" strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute -top-[5px] right-[-6px] inline-flex items-center justify-center font-medium rounded-full text-[12px] h-[22px] px-[6px] leading-none bg-[#8774e1] text-white shadow-sm border-[2px] border-[#212121]">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Chat info */}
      <div className="flex flex-1 min-w-0 items-center overflow-hidden h-full">
        {/* Topic icon */}
        <div className="relative w-[30px] h-[30px] flex items-center justify-center shrink-0">
          <span className="relative w-[30px] h-[30px] flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 26 26">
              <defs>
                <linearGradient id="topic-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6B93FF" />
                  <stop offset="100%" stopColor="#2881CE" />
                </linearGradient>
              </defs>
              <path d="M21.3733 4.27035C19.2176 2.25323 16.2016 1 12.8636 1C6.31153 1 1 5.82866 1 11.7851C1 15.1823 2.58685 17.9669 5.28707 19.9438C5.63238 20.1966 5.95042 21.6013 5.18073 22.7812C4.86598 23.2637 4.51948 23.639 4.25272 23.928C3.86715 24.3457 3.6482 24.5828 3.93266 24.7022C4.22935 24.8266 5.98245 24.8882 7.24776 24.1786C8.23812 23.6232 8.83793 23.0691 9.24187 22.696C9.57588 22.3875 9.77595 22.2027 9.95217 22.2431C10.584 22.388 11.236 22.4868 11.9035 22.5354C11.9126 22.5361 11.9218 22.5368 11.9309 22.5374C12.2386 22.5592 12.5497 22.5702 12.8636 22.5702C19.4157 22.5702 24.7273 17.7416 24.7273 11.7851C24.7273 8.86318 23.4491 6.21263 21.3733 4.27035Z" fill="url(#topic-icon-gradient)" stroke="#0e5285" strokeWidth="0.5"></path>
            </svg>
            <span className="text-[14px] font-bold text-white z-10 -mt-[1px]">A</span>
          </span>
        </div>
        {/* Text content */}
        <div className="flex flex-col flex-1 min-w-0 ml-[10px] justify-center overflow-hidden h-full">
          <div className="flex items-center">
            <span className="text-[16px] font-medium leading-[20px] text-white truncate">{title}</span>
          </div>
          <div className="flex items-center text-[13px] leading-[18px] text-[#aaaaaa] truncate mt-[-1px]">
            {subtitle}
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="flex items-center shrink-0 ml-1">
        <button className="flex items-center justify-center w-10 h-10 rounded-full border-0 bg-transparent outline-none cursor-pointer text-[#aaaaaa] transition-colors duration-200 shrink-0 hover:bg-white/8">
          <MoreVertical className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
