"use client";

import Image from 'next/image';
import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Mic, Send } from 'lucide-react';

export default function MessageInput() {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '24px';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [message]);

  return (
    <div className="flex items-center gap-[8px] w-full px-1 text-[var(--tg-text)]">

      {/* Attach */}
      <button className="liquid-glass liquid-glass--gray flex items-center justify-center size-[42px] rounded-full shrink-0 text-white transition-transform duration-200 active:scale-95">
        <Paperclip className="relative z-[1] w-[24px] h-[24px]" strokeWidth={1.5} />
      </button>

      {/* Input pill */}
      <div className="liquid-glass liquid-glass--gray flex flex-1 items-center min-w-0 h-[42px] rounded-full overflow-hidden pl-[18px] pr-[5px]">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message"
          rows={1}
          className="relative z-[1] flex-1 bg-transparent text-white placeholder-[var(--tg-text-secondary)] outline-none resize-none text-[17px] leading-[24px] min-h-[24px] max-h-[120px]"
          style={{ fontFamily: 'var(--tg-font)' }}
        />
        <button className="relative z-[1] flex items-center justify-center size-[32px] rounded-full text-[var(--tg-text-secondary)] hover:text-white transition-colors duration-200 shrink-0 ml-1">
          <Image
            src="/telegram-sticker-logo.png"
            alt=""
            width={24}
            height={24}
            unoptimized
            aria-hidden="true"
            className="w-[24px] h-[24px] opacity-80"
          />
        </button>
      </div>

      {/* Send / Mic */}
      <button
        className="liquid-glass liquid-glass--gray flex items-center justify-center size-[42px] rounded-full shrink-0 text-white transition-transform duration-200 active:scale-95"
        onClick={() => {
          if (message.trim()) {
            console.log('Sending message:', message);
            setMessage('');
          }
        }}
      >
        {message.trim() ? (
          <Send className="relative z-[1] w-[20px] h-[20px] ml-[2px]" strokeWidth={2} />
        ) : (
          <Mic className="relative z-[1] size-[26px]" strokeWidth={1.5} />
        )}
      </button>
    </div>
  );
}
