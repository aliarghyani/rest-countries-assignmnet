import { test, expect } from '@playwright/test';

import { mockRestCountries } from './fixtures';

test.describe('Search functionality', () => {
  test.beforeEach(async ({ page }) => {
    await mockRestCountries(page);
  });

  test('filters countries by search input and sorts by name', async ({ page }) => {
    await page.goto('/');

    const search = page.getByPlaceholder('Country Name');
    await search.click();
    await search.fill('Bra');

    await expect(page.getByText('Brazil')).toBeVisible();
    await expect(page.getByText('Poland')).toHaveCount(0);

    // Clear search
    await search.fill('');

    // Choose sort by name
    const sortSelect = page.getByLabel('Sort By');
    await sortSelect.click();
    await page.getByRole('option', { name: /name/i }).click();

    // Visual snapshot for the grid after sort
    await expect(page).toHaveScreenshot('home-sorted-by-name.png', { fullPage: true });
  });
});

