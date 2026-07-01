import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium, expect } from '@playwright/test';

const port = Number(process.env.GUIDE_COVER_VERIFY_PORT || 3121);
const baseUrl = `http://127.0.0.1:${port}`;

const narrowSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="#2563eb"/></svg>';
const wideSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="640"><rect width="1200" height="640" fill="#16a34a"/></svg>';

const guideListResponse = {
  guides: [
    {
      slug: 'narrow-cover',
      title: '窄封面攻略',
      excerpt: '用于验证攻略列表窄图不被拉伸。',
      coverUrl: '/test-assets/narrow-cover.svg',
      source: 'contract',
      updatedAt: '2026-07-01',
      publishedAt: '2026-07-01',
      readingMinutes: 1,
      tags: ['测试'],
      pinned: false,
    },
    {
      slug: 'wide-cover',
      title: '宽封面攻略',
      excerpt: '用于保留宽图最大宽度限制。',
      coverUrl: '/test-assets/wide-cover.svg',
      source: 'contract',
      updatedAt: '2026-07-01',
      publishedAt: '2026-07-01',
      readingMinutes: 1,
      tags: ['测试'],
      pinned: false,
    },
  ],
  pagination: {
    page: 1,
    limit: 12,
    total: 2,
    totalPages: 1,
    hasMore: false,
  },
};

function startServer() {
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--port', String(port)], {
    cwd: process.cwd(),
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });
  return { child, getOutput: () => output };
}

async function waitForServer(getOutput) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 60_000) {
    if (getOutput().includes('Ready')) return;
    try {
      const response = await fetch(`${baseUrl}/guides`);
      if (response.status < 500) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Next dev server did not become ready on ${baseUrl}\n${getOutput()}`);
}

async function installRoutes(page) {
  await page.route('**/api/guides?**', (route) => route.fulfill({ json: guideListResponse }));
  await page.route('**/test-assets/narrow-cover.svg', (route) =>
    route.fulfill({
      body: narrowSvg,
      contentType: 'image/svg+xml',
    }),
  );
  await page.route('**/test-assets/wide-cover.svg', (route) =>
    route.fulfill({
      body: wideSvg,
      contentType: 'image/svg+xml',
    }),
  );
}

async function verifyGuideListCoverSizing(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await installRoutes(page);
  await page.goto(`${baseUrl}/guides`, { waitUntil: 'domcontentloaded', timeout: 20_000 });

  await expect(page.getByRole('heading', { name: '窄封面攻略' })).toBeVisible();
  const narrowImage = page.getByAltText('窄封面攻略');
  const wideImage = page.getByAltText('宽封面攻略');
  await expect(narrowImage).toBeVisible();
  await expect(wideImage).toBeVisible();

  const narrow = await narrowImage.evaluate((image) => {
    const element = image;
    const box = element.getBoundingClientRect();
    const parentBox = element.parentElement?.getBoundingClientRect();
    const computed = window.getComputedStyle(element);
    return {
      renderedWidth: Math.round(box.width),
      renderedHeight: Math.round(box.height),
      naturalWidth: element.naturalWidth,
      parentWidth: Math.round(parentBox?.width || 0),
      widthStyle: computed.width,
      heightStyle: computed.height,
    };
  });

  const wide = await wideImage.evaluate((image) => {
    const box = image.getBoundingClientRect();
    const parentBox = image.parentElement?.getBoundingClientRect();
    return {
      renderedWidth: Math.round(box.width),
      parentWidth: Math.round(parentBox?.width || 0),
    };
  });

  assert.equal(narrow.naturalWidth, 120);
  assert.ok(narrow.parentWidth > narrow.naturalWidth, `Expected card image area wider than source image, got ${JSON.stringify(narrow)}`);
  assert.ok(
    narrow.renderedWidth <= narrow.naturalWidth + 1,
    `Narrow cover should render at original width instead of stretching to card width: ${JSON.stringify(narrow)}`,
  );
  assert.ok(
    wide.renderedWidth <= wide.parentWidth,
    `Wide cover should still be limited by card image area: ${JSON.stringify(wide)}`,
  );

  await page.close();
}

const server = startServer();
let browser;

try {
  await waitForServer(server.getOutput);
  browser = await chromium.launch();
  await verifyGuideListCoverSizing(browser);
  console.log('guide cover natural-size browser verification passed');
} finally {
  if (browser) await browser.close();
  server.child.kill();
}
