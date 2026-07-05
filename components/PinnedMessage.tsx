import React from 'react';
import { X } from 'lucide-react';
import MarkerStrike from '@/components/MarkerStrike';

interface PinnedMessageProps {
  text?: string;
  hideNames?: boolean;
}

// Strike the @username and the 👤 display name, keep every other part of the
// pinned text visible around the marker strokes.
function pinnedPreview(text: string, hideNames: boolean) {
  if (!hideNames) return text;

  const pattern = /@[A-Za-z0-9_]+|👤\s*[^🆔🤑👤✅🌐@]+/gu;
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    nodes.push(text.slice(cursor, match.index));
    const segment = match[0];

    if (segment.startsWith('@')) {
      nodes.push(<MarkerStrike key={match.index} text={segment} className="marker-strike--inline" />);
    } else {
      const name = segment.replace(/^👤\s*/u, '').trimEnd();
      nodes.push(
        <React.Fragment key={match.index}>
          {'👤 '}
          <MarkerStrike text={name} className="marker-strike--inline" />
          {segment.slice(segment.indexOf(name) + name.length)}
        </React.Fragment>
      );
    }
    cursor = match.index + segment.length;
  }
  nodes.push(text.slice(cursor));

  return nodes.length > 1 ? <>{nodes}</> : text;
}

export default function PinnedMessage({ text, hideNames = false }: PinnedMessageProps) {
  const previewText = text || '🆔 1359404829 🤑 @alfz56 👤 Alfz ✅ Telegram Premium User 🌐 Language: en';

  return (
    <div
      className="liquid-glass flex items-center w-full cursor-pointer relative text-[var(--tg-text)] shrink-0 z-[2]"
      style={{
        height: '44px',
        borderRadius: '27px',
        paddingLeft: '20px',
        paddingRight: '14px',
      }}
    >
      {/* Pinned content wrapper */}
      <div className="relative z-[1] flex flex-1 overflow-hidden items-center h-full min-w-0">
        {/* White vertical bar indicator */}
        <div className="w-[2.5px] h-[32px] bg-white rounded-full shrink-0"></div>

        <div className="flex flex-col flex-1 min-w-0 ml-[12px] justify-center overflow-hidden h-full gap-[1px]">
          <div className="flex items-center">
            <span className="text-white text-[14px] leading-[19px] truncate">Pinned Message</span>
          </div>
          <div className="text-[14px] leading-[18px] text-[#c8c8cc] truncate">
            {pinnedPreview(previewText, hideNames)}
          </div>
        </div>
      </div>

      {/* Close button */}
      <button className="relative z-[1] flex items-center justify-center size-[32px] rounded-full border-0 bg-transparent outline-none cursor-pointer text-[#c8c8cc] transition-colors duration-200 shrink-0 hover:bg-white/10 ml-1">
        <X className="size-[18px]" strokeWidth={2} />
      </button>
    </div>
  );
}
