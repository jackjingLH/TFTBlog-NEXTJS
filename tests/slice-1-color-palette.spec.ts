import { test, expect } from '@playwright/test';

test.describe('Slice 1: Tailwind Color Palette', () => {
  test('homepage should have white background', async ({ page }) => {
    await page.goto('/');

    // Check body background color
    const bodyBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });

    // White background: rgb(255, 255, 255)
    expect(bodyBg).toBe('rgb(255, 255, 255)');
  });

  test('homepage should have dark text color', async ({ page }) => {
    await page.goto('/');

    // Check body text color
    const bodyColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).color;
    });

    // Near-black text: rgb(17, 24, 39) = #111827
    expect(bodyColor).toBe('rgb(17, 24, 39)');
  });

  test('guides page should have white background', async ({ page }) => {
    await page.goto('/guides');

    const bodyBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });

    expect(bodyBg).toBe('rgb(255, 255, 255)');
  });

  test('data page should have white background', async ({ page }) => {
    await page.goto('/data');

    const bodyBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });

    expect(bodyBg).toBe('rgb(255, 255, 255)');
  });

  test('page should not have old dark background color', async ({ page }) => {
    await page.goto('/');

    const bodyBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });

    // Should NOT be the old dark background: #0F0F23 = rgb(15, 15, 35)
    expect(bodyBg).not.toBe('rgb(15, 15, 35)');
  });
});
