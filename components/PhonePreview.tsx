'use client';

import { memo, useLayoutEffect, useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import ChatCanvas from '@/components/ChatCanvas';
import { Button } from '@/components/ui/button';
import { ReviewSet } from '@/lib/types';
import { DeviceId, getDevice } from '@/lib/devices';
import { exportChatScreenshot } from '@/lib/export-screenshot';

const StableChatCanvas = memo(ChatCanvas);

interface PhonePreviewProps {
  review: ReviewSet;
  botName?: string;
  botAvatarInitial?: string;
  botAvatarColor?: string;
  botAvatarImage?: string;
  showProfileIntro?: boolean;
  hideNames?: boolean;
  device?: DeviceId;
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
  hideNames = false,
  device,
  downloadName = 'review',
  hideCta = false,
  hostRef,
}: PhonePreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [phoneReady, setPhoneReady] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const screen = getDevice(device);

  // Scale the fixed device screen (plus the 30px iPhone rim around it) to fit
  // the dock. useLayoutEffect sets --phone-scale before paint so the phone
  // never flashes at the wrong size; a loader covers the frame until measured.
  useLayoutEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const update = () => {
      const scale = Math.min(el.clientWidth / (screen.width + 30), el.clientHeight / (screen.height + 30), 1);
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
  }, [screen.width, screen.height]);

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
        style={{
          '--screen-w': `${screen.width}px`,
          '--screen-h': `${screen.height}px`,
        } as React.CSSProperties}
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
        {/* Notch overlay (16e) — part of the mockup frame only; sits above the
            screen but outside .chat-bg so exports never include it. */}
        {screen.cutout === 'notch' && <div className="phone-notch" aria-hidden="true" />}
        <StableChatCanvas
          review={review}
          botName={botName}
          botAvatarInitial={botAvatarInitial}
          botAvatarColor={botAvatarColor}
          botAvatarImage={botAvatarImage}
          showProfileIntro={showProfileIntro}
          hideNames={hideNames}
          device={device}
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
