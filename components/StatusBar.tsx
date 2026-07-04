import React from 'react';

export default function StatusBar() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const timeString = `${hours}:${minutes}`;

  return (
    <div className="flex items-center justify-between w-full px-[24px] h-[54px] shrink-0 relative">
      {/* Left — Time */}
      <span className="text-white text-[15px] font-semibold tracking-tight w-[54px] flex justify-center">
        {timeString}
      </span>

      {/* Center — Dynamic Island (iPhone 16 Pro) */}
      <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
        <div
          className="rounded-full bg-black"
          style={{
            width: '118px',
            height: '35px',
          }}
        />
      </div>

      {/* Right — Signal, WiFi, Battery */}
      <div className="flex items-center gap-[5px] justify-end w-[70px]">
        {/* Cellular */}
        <img src="/reception.png" alt="reception" className="h-[11px] w-auto object-contain" />

        {/* WiFi */}
        <img src="/wifi.png" alt="wifi" className="h-[11px] w-auto object-contain" />

        {/* Battery */}
        <img src="/_battery.png" alt="battery" className="h-[12px] w-auto object-contain" />
      </div>
    </div>
  );
}
