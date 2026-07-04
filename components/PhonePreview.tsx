'use client';

import { memo, useLayoutEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Download, Loader2 } from 'lucide-react';
import ChatCanvas from '@/components/ChatCanvas';
import { Button } from '@/components/ui/button';
import { ReviewSet } from '@/lib/types';

const SCREEN_WIDTH = 402;
const SCREEN_HEIGHT = 874;
const StableChatCanvas = memo(ChatCanvas);

interface PhonePreviewProps {
  review: ReviewSet;
  botName?: string;
  botAvatarInitial?: string;
  botAvatarColor?: string;
  botAvatarImage?: string;
  showProfileIntro?: boolean;
  downloadName?: string;
}

async function waitForImages(node: HTMLElement) {
  const images = Array.from(node.querySelectorAll('img'));
  await Promise.all(
    images.map(async (image) => {
      if (image.complete) return;
      await image.decode().catch(() => undefined);
    })
  );
}

function nextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function copyScrollPositions(source: HTMLElement, target: HTMLElement) {
  const sourceNodes = [source, ...Array.from(source.querySelectorAll<HTMLElement>('*'))];
  const targetNodes = [target, ...Array.from(target.querySelectorAll<HTMLElement>('*'))];

  sourceNodes.forEach((sourceNode, index) => {
    const targetNode = targetNodes[index];
    if (!targetNode) return;
    targetNode.scrollTop = sourceNode.scrollTop;
    targetNode.scrollLeft = sourceNode.scrollLeft;
  });
}

function syncChatScroll(source: HTMLElement, target: HTMLElement) {
  const sourceScroll = source.querySelector<HTMLElement>('.chat-scroll');
  const targetScroll = target.querySelector<HTMLElement>('.chat-scroll');
  if (!sourceScroll || !targetScroll) return;

  targetScroll.scrollTop = sourceScroll.scrollTop;
  targetScroll.scrollLeft = sourceScroll.scrollLeft;
}

function createExportClone(node: HTMLElement) {
  const clone = node.cloneNode(true) as HTMLElement;

  Object.assign(clone.style, {
    position: 'relative',
    top: '0',
    left: '0',
    width: `${SCREEN_WIDTH}px`,
    height: `${SCREEN_HEIGHT}px`,
    maxWidth: 'none',
    margin: '0',
    transform: 'none',
    opacity: '1',
    transition: 'none',
    borderRadius: '44px',
    overflow: 'hidden',
  });

  // html-to-image (SVG foreignObject) fails to render CSS backdrop-filter on Chrome/WebKit.
  // It results in solid black/gray boxes. We must strip the blur and use an opaque gradient fallback.
  clone.querySelectorAll<HTMLElement>('.chat-glass').forEach((glass) => {
    glass.style.backdropFilter = 'none';
    glass.style.setProperty('-webkit-backdrop-filter', 'none');
    glass.style.maskImage = 'none';
    glass.style.setProperty('-webkit-mask-image', 'none');

    if (glass.classList.contains('chat-glass--top')) {
      glass.style.background =
        'linear-gradient(to bottom, rgba(16,16,18,0.96) 0%, rgba(16,16,18,0.85) 60%, rgba(16,16,18,0.4) 85%, rgba(16,16,18,0) 100%)';
    } else {
      glass.style.background =
        'linear-gradient(to top, rgba(16,16,18,0.98) 0%, rgba(16,16,18,0.9) 60%, rgba(16,16,18,0.4) 85%, rgba(16,16,18,0) 100%)';
    }
  });

  return clone;
}

export default function PhonePreview({
  review,
  botName,
  botAvatarInitial,
  botAvatarColor,
  botAvatarImage,
  showProfileIntro,
  downloadName = 'review',
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

    const exportHost = document.createElement('div');
    const exportNode = createExportClone(node);

    setDownloading(true);
    try {
      Object.assign(exportHost.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: `${SCREEN_WIDTH}px`,
        height: `${SCREEN_HEIGHT}px`,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: '-1',
      });

      copyScrollPositions(node, exportNode);
      exportHost.appendChild(exportNode);
      document.body.appendChild(exportHost);

      await nextFrame();
      syncChatScroll(node, exportNode);
      await nextFrame();
      await document.fonts.ready;
      await waitForImages(exportNode);

      const dataUrl = await toPng(exportNode, {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `${downloadName}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Unable to export screenshot', error);
    } finally {
      exportHost.remove();
      setDownloading(false);
    }
  };

  return (
    <section className="preview-dock">
      <div
        className={`dashboard-preview-wrap dashboard-panel${phoneReady ? ' is-ready' : ''}`}
        ref={previewRef}
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
    </section>
  );
}
