import { Pin, X } from 'lucide-react';

interface PinnedMessageProps {
  text?: string;
}

export default function PinnedMessage({ text }: PinnedMessageProps) {
  return (
    <div
      className="flex items-center w-full cursor-pointer relative text-[var(--tg-text)] shrink-0"
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
      
      {/* Pin button */}
      <button className="flex items-center justify-center w-10 h-10 rounded-full border-0 bg-transparent outline-none cursor-pointer text-[#aaaaaa] transition-colors duration-200 shrink-0 hover:bg-white/8 mr-1">
        <div className="flex items-center justify-center pt-[2px] opacity-80">
          <Pin className="w-5 h-5 transform -rotate-45" strokeWidth={2} />
        </div>
      </button>

      {/* Pinned content wrapper */}
      <div className="flex flex-1 overflow-hidden items-center h-full min-w-0">
        {/* Purple vertical bar indicator */}
        <div className="w-[2px] h-[34px] bg-[#8774e1] rounded-full shrink-0"></div>

        <div className="flex flex-col flex-1 min-w-0 ml-[8px] justify-center overflow-hidden h-full">
          <div className="flex items-center">
            <span className="text-[#8774e1] text-[15px] font-medium leading-[20px] truncate">Pinned Message</span>
          </div>
          <div className="text-[13px] leading-[18px] text-[#aaaaaa] truncate mt-[-1px]">
            🆔 1359404829 🤑 @alfz56 👤 Alfz ✅ Telegram Premium User 🌐 Language: en
          </div>
        </div>
      </div>

      {/* Close button */}
      <button className="flex items-center justify-center w-10 h-10 rounded-full border-0 bg-transparent outline-none cursor-pointer text-[#aaaaaa] transition-colors duration-200 shrink-0 hover:bg-white/8 ml-1">
        <X className="w-6 h-6" strokeWidth={2} />
      </button>
    </div>
  );
}
