import { test, expect } from '@playwright/test';

test.describe('Slice 4: Pin Indicator UI', () => {
  test.beforeAll(async () => {
    // Ensure gwen-pyke is pinned for testing
    const sqlite3 = require('sqlite3');
    const path = require('path');
    const dbPath = path.join(process.cwd(), 'data/tftblog.sqlite');
    const db = new sqlite3.Database(dbPath);

    await new Promise<void>((resolve, reject) => {
      db.run('UPDATE guides SET pinned = 1, pinned_order = 1 WHERE slug = ?', ['gwen-pyke'], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    db.close();
  });

  test.afterAll(async () => {
    // Cleanup: Unpin all guides
    const sqlite3 = require('sqlite3');
    const path = require('path');
    const dbPath = path.join(process.cwd(), 'data/tftblog.sqlite');
    const db = new sqlite3.Database(dbPath);

    await new Promise<void>((resolve, reject) => {
      db.run('UPDATE guides SET pinned = 0, pinned_order = NULL', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    db.close();
  });

  test('pinned guide shows pin indicator on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/guides');

    // Wait for guides to load
    await page.waitForSelector('a[href*="/guides/"]', { timeout: 10000 });

    // Find the pinned guide card
    const pinnedCard = page.locator('a[href="/guides/gwen-pyke"]').first();
    await expect(pinnedCard).toBeVisible();

    // Check for pin indicator
    const pinIndicator = pinnedCard.locator('text=/📌|置顶/');
    await expect(pinIndicator).toBeVisible();
  });

  test('pinned guide shows pin indicator on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/guides');

    await page.waitForSelector('a[href*="/guides/"]', { timeout: 10000 });

    const pinnedCard = page.locator('a[href="/guides/gwen-pyke"]').first();
    await expect(pinnedCard).toBeVisible();

    const pinIndicator = pinnedCard.locator('text=/📌|置顶/');
    await expect(pinIndicator).toBeVisible();
  });

  test('unpinned guide does not show pin indicator', async ({ page }) => {
    await page.goto('/guides');

    await page.waitForSelector('a[href*="/guides/"]', { timeout: 10000 });

    // Find an unpinned guide
    const unpinnedCard = page.locator('a[href="/guides/hedge-fund"]').first();
    await expect(unpinnedCard).toBeVisible();

    // Should NOT have pin indicator
    const pinIndicator = unpinnedCard.locator('text=/📌|置顶/');
    await expect(pinIndicator).not.toBeVisible();
  });

  test('pin indicator has accent color styling', async ({ page }) => {
    await page.goto('/guides');

    await page.waitForSelector('a[href*="/guides/"]', { timeout: 10000 });

    const pinnedCard = page.locator('a[href="/guides/gwen-pyke"]').first();
    const pinIndicator = pinnedCard.locator('text=/📌|置顶/').first();

    // Check if indicator has accent background (indigo color)
    const bgColor = await pinIndicator.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Should have some color (not transparent)
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
  });
});
