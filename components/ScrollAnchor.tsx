'use client';

import { useEffect, useRef } from 'react';

/**
 * Invisible marker placed at the end of the chat.
 * Scrolls itself into view on mount so the chat starts at the bottom.
 */
export default function ScrollAnchor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView();
  }, []);

  return <div ref={ref} />;
}
