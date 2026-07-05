import React from 'react';

type StatusBarProps = {
  time?: string;
  /**
   * 'island' draws the Dynamic Island pill. 'notch' (iPhone 16e) draws
   * nothing — the notch is a hardware cutout and never shows up in a real
   * iOS screenshot.
   */
  cutout?: 'island' | 'notch';
};

export default function StatusBar({ time, cutout = 'island' }: StatusBarProps) {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const timeString = time?.trim() || `${hours}:${minutes}`;

  return (
    <div className="flex items-center justify-between w-full px-[24px] h-[50px] shrink-0 relative">
      {/* Left — Time */}
      <span className="text-white text-[15px] font-semibold tracking-tight w-[54px] flex justify-center">
        {timeString}
      </span>

      {/* Center — Dynamic Island (hidden on notch devices) */}
      {cutout === 'island' && (
        <div className="absolute left-1/2 -translate-x-1/2 top-[8px]">
          <div
            className="rounded-full bg-black"
            style={{
              width: '125px',
              height: '35px',
            }}
          />
        </div>
      )}

      {/* Right — Signal, WiFi, Battery */}
      <div className="flex items-center gap-[5px] justify-end w-[70px]">
        {/* Cellular */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/reception.png" alt="reception" className="h-[11px] w-auto object-contain" />

        {/* WiFi */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/wifi.png" alt="wifi" className="h-[11px] w-auto object-contain" />

        {/* Battery */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/_battery.png" alt="battery" className="h-[12px] w-auto object-contain" />
      </div>
    </div>
  );
}
