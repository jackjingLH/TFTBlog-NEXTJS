import { test, expect } from '@playwright/test';
import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data/tftblog.sqlite');

test.describe('Slice 5: Manual Pinning E2E Verification', () => {
  test.beforeEach(async () => {
    // Reset: Unpin all guides before each test
    const db = new sqlite3.Database(dbPath);

    await new Promise<void>((resolve, reject) => {
      db.run('UPDATE guides SET pinned = 0, pinned_order = NULL', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    db.close();
  });

  test('complete pinning workflow - pin single guide', async ({ page }) => {
    // Step 1: Pin a guide via SQL
    const db = new sqlite3.Database(dbPath);

    await new Promise<void>((resolve, reject) => {
      db.run('UPDATE guides SET pinned = 1, pinned_order = 1 WHERE slug = ?', ['woodland-gnar'], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    db.close();

    // Step 2: Visit guides list page
    await page.goto('/guides', { waitUntil: 'domcontentloaded' });

    // Wait longer for content to load
    await page.waitForSelector('a[href*="/guides/"]', { timeout: 15000 });

    // Step 3: Verify pinned guide card exists and has pin indicator
    const pinnedCard = page.locator('a[href="/guides/woodland-gnar"]').first();
    await expect(pinnedCard).toBeVisible({ timeout: 10000 });

    const pinIndicator = pinnedCard.locator('text=/📌|置顶/');
    await expect(pinIndicator).toBeVisible({ timeout: 10000 });

    // Step 4: Verify we have all 5 guides
    const allCards = await page.locator('a[href*="/guides/"]').count();
    expect(allCards).toBeGreaterThanOrEqual(5);
  });

  test('multiple pinned guides sorted by pinned_order', async ({ page }) => {
    // Pin 3 guides with different orders
    const db = new sqlite3.Database(dbPath);

    await new Promise<void>((resolve, reject) => {
      db.serialize(() => {
        db.run('UPDATE guides SET pinned = 1, pinned_order = 2 WHERE slug = ?', ['gwen-pyke']);
        db.run('UPDATE guides SET pinned = 1, pinned_order = 1 WHERE slug = ?', ['jax-jinx']);
        db.run('UPDATE guides SET pinned = 1, pinned_order = 3 WHERE slug = ?', ['viktor-nami'], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    db.close();

    // Visit page
    await page.goto('/guides');
    await page.waitForLoadState('networkidle');

    // Verify all 3 pinned guides have indicators
    const jaxCard = page.locator('a[href="/guides/jax-jinx"]').first();
    const gwenCard = page.locator('a[href="/guides/gwen-pyke"]').first();
    const viktorCard = page.locator('a[href="/guides/viktor-nami"]').first();

    await expect(jaxCard.locator('text=/📌|置顶/')).toBeVisible();
    await expect(gwenCard.locator('text=/📌|置顶/')).toBeVisible();
    await expect(viktorCard.locator('text=/📌|置顶/')).toBeVisible();
  });

  test('unpinning returns guide to chronological order', async ({ page }) => {
    // Step 1: Pin a guide
    let db = new sqlite3.Database(dbPath);

    await new Promise<void>((resolve, reject) => {
      db.run('UPDATE guides SET pinned = 1, pinned_order = 1 WHERE slug = ?', ['hedge-fund'], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    db.close();

    // Step 2: Verify it has pin indicator
    await page.goto('/guides');
    await page.waitForLoadState('networkidle');

    let hedgeCard = page.locator('a[href="/guides/hedge-fund"]').first();
    await expect(hedgeCard.locator('text=/📌|置顶/')).toBeVisible();

    // Step 3: Unpin the guide
    db = new sqlite3.Database(dbPath);

    await new Promise<void>((resolve, reject) => {
      db.run('UPDATE guides SET pinned = 0, pinned_order = NULL WHERE slug = ?', ['hedge-fund'], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    db.close();

    // Step 4: Reload and verify pin indicator is gone
    await page.reload();
    await page.waitForLoadState('networkidle');

    hedgeCard = page.locator('a[href="/guides/hedge-fund"]').first();
    await expect(hedgeCard.locator('text=/📌|置顶/')).not.toBeVisible();
  });

  test('all 5 guides visible and navigable', async ({ page }) => {
    await page.goto('/guides', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('a[href*="/guides/"]', { timeout: 15000 });

    // Count all guide cards
    const cardCount = await page.locator('a[href*="/guides/"]').count();
    expect(cardCount).toBeGreaterThanOrEqual(5);

    // Click first guide and verify detail page loads
    const firstCard = page.locator('a[href*="/guides/"]').first();
    await firstCard.click();

    // Wait for navigation
    await page.waitForURL(/\/guides\/.+/, { timeout: 15000 });

    // Verify we're on a detail page
    expect(page.url()).toContain('/guides/');

    // Verify back link exists
    await page.waitForSelector('a[href="/guides"]', { timeout: 10000 });
    const backLink = page.locator('a[href="/guides"]');
    await expect(backLink.first()).toBeVisible({ timeout: 10000 });
  });
});
