import { test, expect } from '@playwright/test';
import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data/tftblog.sqlite');

test.describe('Slice 3: API Sorting Logic', () => {
  test.beforeAll(async () => {
    // Setup: Pin some guides for testing
    const db = new sqlite3.Database(dbPath);

    await new Promise<void>((resolve, reject) => {
      db.run('UPDATE guides SET pinned = 1, pinned_order = 1 WHERE slug = ?', ['gwen-pyke'], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise<void>((resolve, reject) => {
      db.run('UPDATE guides SET pinned = 1, pinned_order = 2 WHERE slug = ?', ['jax-jinx'], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    db.close();
  });

  test.afterAll(async () => {
    // Cleanup: Unpin all guides
    const db = new sqlite3.Database(dbPath);

    await new Promise<void>((resolve, reject) => {
      db.run('UPDATE guides SET pinned = 0, pinned_order = NULL', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    db.close();
  });

  test('API returns guides with pinned first', async ({ page }) => {
    const response = await page.request.get('http://localhost:3000/api/guides');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    const guides = data.guides || data;

    expect(guides.length).toBeGreaterThanOrEqual(5);

    // First two should be pinned guides
    expect(guides[0].slug).toBe('gwen-pyke');
    expect(guides[1].slug).toBe('jax-jinx');

    // Remaining should be unpinned (in any order)
    const unpinnedSlugs = guides.slice(2).map((g: any) => g.slug);
    expect(unpinnedSlugs).toContain('hedge-fund');
    expect(unpinnedSlugs).toContain('viktor-nami');
    expect(unpinnedSlugs).toContain('woodland-gnar');
  });

  test('pinned guides sorted by pinned_order', async ({ page }) => {
    const response = await page.request.get('http://localhost:3000/api/guides');
    const data = await response.json();
    const guides = data.guides || data;

    // gwen-pyke (order 1) should come before jax-jinx (order 2)
    const gwenIndex = guides.findIndex((g: any) => g.slug === 'gwen-pyke');
    const jaxIndex = guides.findIndex((g: any) => g.slug === 'jax-jinx');

    expect(gwenIndex).toBeLessThan(jaxIndex);
  });

  test('API response includes pinned field', async ({ page }) => {
    const response = await page.request.get('http://localhost:3000/api/guides');
    const data = await response.json();
    const guides = data.guides || data;

    const gwenGuide = guides.find((g: any) => g.slug === 'gwen-pyke');
    expect(gwenGuide.pinned).toBeDefined();
    expect(gwenGuide.pinned).toBe(true);

    const hedgeGuide = guides.find((g: any) => g.slug === 'hedge-fund');
    expect(hedgeGuide.pinned).toBeDefined();
    expect(hedgeGuide.pinned).toBe(false);
  });
});
