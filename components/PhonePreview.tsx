'use client';

import { memo, useLayoutEffect, useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import ChatCanvas from '@/components/ChatCanvas';
import { Button } from '@/components/ui/button';
import { ReviewSet } from '@/lib/types';
import { exportChatScreenshot } from '@/lib/export-screenshot';

const StableChatCanvas = memo(ChatCanvas);

interface PhonePreviewProps {
  review: ReviewSet;
  botName?: string;
  botAvatarInitial?: string;
  botAvatarColor?: string;
  botAvatarImage?: string;
  showProfileIntro?: boolean;
  downloadName?: string;
  /** Hide the built-in CTA when the page renders its own export button. */
  hideCta?: boolean;
  /** Receives the preview host element so a parent can trigger exports. */
  hostRef?: React.MutableRefObject<HTMLDivElement | null>;
}

export default function PhonePreview({
  review,
  botName,
  botAvatarInitial,
  botAvatarColor,
  botAvatarImage,
  showProfileIntro,
  downloadName = 'review',
  hideCta = false,
  hostRef,
}: PhonePreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [phoneReady, setPhoneReady] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Scale the fixed 402x874 screen (inside its 420x892 iPhone frame) to fit the
  // dock. useLayoutEffect sets --phone-scale before paint so the phone never
  // flashes at the wrong size; a loader covers the frame until first measure.
  useLayoutEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const update = () => {
      const scale = Math.min(el.clientWidth / 432, el.clientHeight / 902, 1);
      el.style.setProperty('--phone-scale', String(scale));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    const reveal = window.setTimeout(() => setPhoneReady(true), 400);
    return () => {
      observer.disconnect();
      window.clearTimeout(reveal);
    };
  }, []);

  const handleDownload = async () => {
    const node = previewRef.current?.querySelector<HTMLElement>('.chat-bg');
    if (!node) return;

    setDownloading(true);
    try {
      await exportChatScreenshot(node, downloadName);
    } catch (error) {
      console.error('Unable to export screenshot', error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="preview-dock">
      <div
        className={`dashboard-preview-wrap dashboard-panel${phoneReady ? ' is-ready' : ''}`}
        ref={(el) => {
          previewRef.current = el;
          if (hostRef) hostRef.current = el;
        }}
      >
        <div className="phone-loader" aria-hidden="true">
          <span className="phone-loader__spinner" />
        </div>
        <div className="phone-rim" aria-hidden="true">
          <span className="phone-rim__btn phone-rim__btn--mute" />
          <span className="phone-rim__btn phone-rim__btn--vup" />
          <span className="phone-rim__btn phone-rim__btn--vdown" />
          <span className="phone-rim__btn phone-rim__btn--power" />
        </div>
        <StableChatCanvas
          review={review}
          botName={botName}
          botAvatarInitial={botAvatarInitial}
          botAvatarColor={botAvatarColor}
          botAvatarImage={botAvatarImage}
          showProfileIntro={showProfileIntro}
        />
      </div>

      {!hideCta && (
        <Button
          variant="brand"
          size="lg"
          className="download-cta"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Download />
          )}
          {downloading ? 'Rendering…' : 'Download screenshot'}
        </Button>
      )}
    </section>
  );
}
