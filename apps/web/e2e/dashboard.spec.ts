import { test, expect } from '@playwright/test';
import { registerUser, injectToken } from './helpers';

test.describe('Dashboard', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/, { timeout: 8_000 });
  });

  test('renders for authenticated user', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await expect(page.getByText(/revenue/i).first()).toBeVisible();
  });

  test('sidebar nav links are present', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await expect(page.getByRole('link', { name: /creators/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /campaigns/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /payouts/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /webhooks/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /settings/i })).toBeVisible();
  });

  test('notifications bell is visible', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await expect(page.locator('[aria-label="notifications"], button:has(svg)').first()).toBeVisible();
  });
});
