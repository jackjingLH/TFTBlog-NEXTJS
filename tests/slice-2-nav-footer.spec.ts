import { test, expect } from '@playwright/test';

test.describe('Slice 2: Navigation & Footer', () => {
  test('navbar should have light background', async ({ page }) => {
    await page.goto('/');

    const navBg = await page.evaluate(() => {
      const nav = document.querySelector('nav');
      return nav ? window.getComputedStyle(nav).backgroundColor : null;
    });

    // Should have white or very light gray background
    expect(navBg).toBeTruthy();
    expect(navBg).not.toBe('rgba(15, 15, 35, 0.85)'); // Old dark background
  });

  test('navbar should not have purple border', async ({ page }) => {
    await page.goto('/');

    const navBorderColor = await page.evaluate(() => {
      const nav = document.querySelector('nav');
      return nav ? window.getComputedStyle(nav).borderBottomColor : null;
    });

    // Should not be purple tinted: rgba(124, 58, 237, 0.35)
    expect(navBorderColor).toBeTruthy();
    expect(navBorderColor).not.toContain('124, 58, 237');
  });

  test('navbar should remain sticky', async ({ page }) => {
    await page.goto('/');

    const navPosition = await page.evaluate(() => {
      const nav = document.querySelector('nav');
      return nav ? window.getComputedStyle(nav).position : null;
    });

    expect(navPosition).toBe('sticky');
  });

  test('navbar links should be visible and clickable', async ({ page }) => {
    await page.goto('/');

    // Check desktop navigation links (visible on desktop, hidden on mobile)
    const desktopNav = page.locator('nav .hidden.sm\\:flex');
    const homeLink = desktopNav.locator('a', { hasText: '首页' });
    const guidesLink = desktopNav.locator('a', { hasText: '攻略' });

    // On desktop (viewport > 640px), links should be visible
    if (page.viewportSize()!.width >= 640) {
      await expect(homeLink).toBeVisible();
      await expect(guidesLink).toBeVisible();
    } else {
      // On mobile, the hamburger menu button should be visible
      const menuButton = page.locator('nav button[aria-label="Toggle menu"]');
      await expect(menuButton).toBeVisible();
    }
  });

  test('navbar touch targets should be adequate on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone size
    await page.goto('/');

    // On mobile, check the menu button (visible touch target)
    const menuButton = page.locator('nav button[aria-label="Toggle menu"]');
    const buttonHeight = await menuButton.evaluate((el) => el.getBoundingClientRect().height);

    // Touch targets should be at least 44px
    expect(buttonHeight).toBeGreaterThanOrEqual(44);
  });
});
