import { NextResponse } from 'next/server';
import { existsSync } from 'node:fs';
import chromium from '@sparticuz/chromium';
import puppeteer, { type LaunchOptions } from 'puppeteer-core';

const IPHONE_16_PRO_WIDTH = 402;
const IPHONE_16_PRO_HEIGHT = 874;
const RETINA_SCALE = 3;

export const runtime = 'nodejs';
export const maxDuration = 30;

function getLocalChromePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const candidates =
    process.platform === 'darwin'
      ? [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Chromium.app/Contents/MacOS/Chromium',
          '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
        ]
      : process.platform === 'win32'
        ? [
            `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
            `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome\\Application\\chrome.exe`,
            `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
          ]
        : [
            '/usr/bin/google-chrome-stable',
            '/usr/bin/google-chrome',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
          ];

  return candidates.find((path): path is string => Boolean(path && existsSync(path)));
}

async function getBrowserLaunchOptions(): Promise<LaunchOptions> {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  if (isServerless) {
    const chromiumArgs = await chromium.args;

    return {
      args: await puppeteer.defaultArgs({
        args: chromiumArgs,
        headless: 'shell',
      }),
      executablePath: await chromium.executablePath(),
      headless: 'shell',
    };
  }

  const executablePath = getLocalChromePath();
  if (!executablePath) {
    throw new Error(
      'Unable to find a local Chrome executable. Set PUPPETEER_EXECUTABLE_PATH to your Chrome or Chromium binary.'
    );
  }

  return {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath,
    headless: true,
  };
}

export async function POST(request: Request) {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;

  try {
    const { html, styles, width, height, scrollBottomOffset } = await request.json();
    const screenWidth = Number(width) || IPHONE_16_PRO_WIDTH;
    const screenHeight = Number(height) || IPHONE_16_PRO_HEIGHT;
    const chatScrollBottomOffset = Math.max(0, Number(scrollBottomOffset) || 0);
    const styleMarkup =
      typeof styles === 'string'
        ? styles.replace(/\\r/g, '\r').replace(/\\n/g, '\n')
        : '';
    
    // Get the origin to fix relative paths for CSS and Images
    const origin = request.headers.get('origin') || 'http://localhost:3000';

    browser = await puppeteer.launch(await getBrowserLaunchOptions());
    
    const page = await browser.newPage();
    await page.setViewport({
      width: screenWidth,
      height: screenHeight,
      deviceScaleFactor: RETINA_SCALE,
    });

    // Construct a full HTML document
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <base href="${origin}">
          ${styleMarkup}
          <style>
            body {
              margin: 0;
              padding: 0;
              background: transparent;
              width: ${screenWidth}px;
              height: ${screenHeight}px;
              overflow: hidden;
            }
            .chat-bg {
              position: relative !important;
              top: 0 !important;
              left: 0 !important;
              width: ${screenWidth}px !important;
              height: ${screenHeight}px !important;
              min-width: ${screenWidth}px !important;
              min-height: ${screenHeight}px !important;
              max-width: none !important;
              max-height: none !important;
              margin: 0 !important;
              transform: none !important;
              opacity: 1 !important;
              transition: none !important;
            }
            #export-root {
              position: fixed;
              inset: 0 auto auto 0;
              width: ${screenWidth}px;
              height: ${screenHeight}px;
              overflow: hidden;
            }
          </style>
        </head>
        <body>
          <main id="export-root">${html}</main>
        </body>
      </html>
    `;

    // Set extra headers to bypass Next.js Dev Server CORS blocking
    await page.setExtraHTTPHeaders({
      'Origin': origin,
      'Referer': origin + '/',
    });

    // Wait until network is idle so CSS and fonts load completely
    await page.setContent(fullHtml, { waitUntil: 'load' });
    
    // Explicitly wait for custom fonts
    await page.evaluateHandle('document.fonts.ready');
    await page.evaluate((bottomOffset) => {
      const scroll = document.querySelector<HTMLElement>('.chat-scroll');
      if (!scroll) return;

      scroll.scrollTop = Math.max(
        0,
        scroll.scrollHeight - scroll.clientHeight - bottomOffset
      );
    }, chatScrollBottomOffset);
    await page.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    }));

    const hasExportNode = await page.$('.chat-bg');
    if (!hasExportNode) {
      throw new Error('Could not find .chat-bg element in the generated HTML');
    }

    const screenshot = await page.screenshot({
      type: 'png',
      omitBackground: true,
      clip: {
        x: 0,
        y: 0,
        width: screenWidth,
        height: screenHeight,
      },
    });
    
    return new NextResponse(Buffer.from(screenshot), {
      headers: {
        'Content-Type': 'image/png',
      },
    });

  } catch (error) {
    console.error('Export Error:', error);
    return NextResponse.json({ error: 'Failed to generate screenshot' }, { status: 500 });
  } finally {
    await browser?.close();
  }
}
