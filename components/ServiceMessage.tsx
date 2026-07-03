import React from 'react';

export default function ServiceMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="tg-service">
      <div className="tg-service-pill">{children}</div>
    </div>
  );
}
