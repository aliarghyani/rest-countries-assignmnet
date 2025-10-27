import { test, expect } from '@playwright/test';

import { mockRestCountries, sampleCountries } from './fixtures';

test.describe('Country navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockRestCountries(page);
  });

  test('navigates from grid card to details and shows borders', async ({ page }) => {
    await page.goto('/');

    // Click the Poland card
    await page.getByRole('link', { name: 'View details for Poland' }).click();

    await expect(page).toHaveURL(/\/Poland$/);
    await expect(page.getByText('Poland')).toBeVisible();

    // Border country from fixtures is Germany (DEU)
    await expect(page.getByText('Germany')).toBeVisible();

    // Visual snapshot for details page
    await expect(page).toHaveScreenshot('country-details.png', { fullPage: true });
  });

  test('collects basic performance metrics', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Perf metrics collected on Chromium only');
    await page.goto('/');

    const perf = await page.evaluate(async () => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const ttfb = nav?.responseStart ?? 0;

      let lcp = 0;
      try {
        const po = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            lcp = Math.max(lcp, entry.startTime || 0);
          }
        });
        // buffered to read past entries
        po.observe({ type: 'largest-contentful-paint', buffered: true } as any);
        // small delay to flush buffered entries
        await new Promise(r => setTimeout(r, 250));
        po.disconnect();
      } catch {}
      return { ttfb, lcp };
    });

    expect(perf.ttfb).toBeGreaterThanOrEqual(0);
    expect(perf.lcp).toBeGreaterThanOrEqual(0);
  });
});
