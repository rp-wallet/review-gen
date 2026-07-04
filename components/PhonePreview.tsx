'use client';

import { memo, useLayoutEffect, useRef, useState } from 'react';
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

function getChatScrollBottomOffset(node: HTMLElement) {
  const scroll = node.querySelector<HTMLElement>('.chat-scroll');
  if (!scroll) return 0;

  return Math.max(0, scroll.scrollHeight - scroll.clientHeight - scroll.scrollTop);
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
    borderRadius: '55px',
    overflow: 'hidden',
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

      // Extract styles and HTML
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');
      const html = exportNode.outerHTML;
      const scrollBottomOffset = getChatScrollBottomOffset(node);

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html,
          styles,
          width: SCREEN_WIDTH,
          height: SCREEN_HEIGHT,
          scrollBottomOffset,
        })
      });

      if (!response.ok) {
        throw new Error('Export failed on server');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.download = `${downloadName}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
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
