import { AxeBuilder } from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

import { mockRestCountries } from './fixtures';

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await mockRestCountries(page);
  });

  test('home page has no critical a11y violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const critical = results.violations.filter(v => v.impact === 'critical');
    expect(critical).toHaveLength(0);
  });

  test('country details has no critical a11y violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'View details for Poland' }).click();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const critical = results.violations.filter(v => v.impact === 'critical');
    expect(critical).toHaveLength(0);
  });
});

