'use client';

import { useEffect, useRef } from 'react';

/**
 * Invisible marker placed at the end of the chat.
 * Scrolls itself into view when the conversation changes so the chat starts at
 * the latest messages.
 */
export default function ScrollAnchor({ watch }: { watch?: unknown }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollParent = ref.current?.closest<HTMLElement>('.chat-scroll');
    if (scrollParent) {
      scrollParent.scrollTop = scrollParent.scrollHeight;
      return;
    }

    ref.current?.scrollIntoView({ block: 'end' });
  }, [watch]);

  return <div ref={ref} />;
}
