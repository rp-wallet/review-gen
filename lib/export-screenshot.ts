export const SCREEN_WIDTH = 402;
export const SCREEN_HEIGHT = 874;

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

/** Renders the given .chat-bg node server-side and downloads it as a PNG. */
export async function exportChatScreenshot(node: HTMLElement, downloadName: string) {
  const exportHost = document.createElement('div');
  const exportNode = createExportClone(node);

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
  } finally {
    exportHost.remove();
  }
}
