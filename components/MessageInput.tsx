"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Smile, Mic, Send } from 'lucide-react';

export default function MessageInput() {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '24px';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${Math.min(scrollHeight, 160)}px`;
    }
  }, [message]);

  return (
    <div className="tg-floating-bar flex items-end w-full px-1 py-[5px] text-[var(--tg-text)] min-h-[3.25rem]">
      
      {/* Attach */}
      <button className="w-10 h-10 flex items-center justify-center rounded-full text-[var(--tg-text-secondary)] hover:bg-white/8 transition-colors duration-200 shrink-0 mb-[1px]">
        <Paperclip className="w-[22px] h-[22px]" />
      </button>

      {/* Input */}
      <div className="flex-1 flex items-end min-h-[2.5rem] px-1 py-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message"
          rows={1}
          className="w-full bg-transparent text-white placeholder-[var(--tg-text-secondary)] outline-none resize-none text-[16px] leading-[1.3125] max-h-40 min-h-[24px]"
          style={{ fontFamily: 'var(--tg-font)' }}
        />
      </div>

      {/* Emoji */}
      <button className="w-10 h-10 flex items-center justify-center rounded-full text-[var(--tg-text-secondary)] hover:bg-white/8 transition-colors duration-200 shrink-0 mb-[1px]">
        <Smile className="w-[22px] h-[22px]" />
      </button>

      {/* Send / Mic */}
      <div className="flex items-center shrink-0 mb-[1px] mr-0.5">
        <button 
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--tg-primary)] hover:brightness-110 text-white shrink-0 transition-all duration-200 active:scale-95"
          onClick={() => {
            if (message.trim()) {
              console.log('Sending message:', message);
              setMessage('');
            }
          }}
        >
          {message.trim() ? (
            <Send className="w-[20px] h-[20px] ml-[2px]" />
          ) : (
            <Mic className="w-[20px] h-[20px]" />
          )}
        </button>
      </div>
    </div>
  );
}
