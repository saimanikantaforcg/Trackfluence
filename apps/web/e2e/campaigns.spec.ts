import { test, expect } from '@playwright/test';
import { registerUser, injectToken } from './helpers';

test.describe('Campaigns — UTM builder and flow', () => {
  test('campaigns page loads and shows header', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/campaigns');
    await expect(page.getByRole('heading', { name: /campaigns/i })).toBeVisible({ timeout: 10_000 });
  });

  test('opens UTM builder modal', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/campaigns');
    // Click the UTM Builder button
    const utmBtn = page.getByRole('button', { name: /utm builder/i });
    await expect(utmBtn).toBeVisible({ timeout: 8_000 });
    await utmBtn.click();
    // Modal should open
    await expect(page.getByText(/utm link builder/i)).toBeVisible({ timeout: 5_000 });
  });

  test('UTM builder generates URL with params', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/campaigns');
    await page.getByRole('button', { name: /utm builder/i }).click();
    await page.fill('input[placeholder*="https://"]', 'https://example.com/product');
    // Generated URL should appear
    await expect(page.locator('text=utm_source')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Creators — onboarding and list', () => {
  test('creators page renders list header', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/creators');
    await expect(page.getByRole('heading', { name: /creators/i })).toBeVisible({ timeout: 10_000 });
  });

  test('Add Creator button opens onboarding wizard', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/creators');
    const addBtn = page.getByRole('button', { name: /add creator/i });
    await expect(addBtn).toBeVisible({ timeout: 8_000 });
    await addBtn.click();
    await expect(page.getByText(/add new creator/i)).toBeVisible({ timeout: 5_000 });
    // Wizard step 1 should show profile fields
    await expect(page.getByPlaceholder(/jane smith/i)).toBeVisible();
  });

  test('onboarding wizard next-step validation', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/creators');
    await page.getByRole('button', { name: /add creator/i }).click();
    // Click Next without filling name
    await page.getByRole('button', { name: /next/i }).click();
    // Should show validation error
    await expect(page.locator('text=/name is required/i')).toBeVisible({ timeout: 5_000 });
  });

  test('compare drawer opens', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/creators');
    const compareBtn = page.getByRole('button', { name: /compare/i });
    await expect(compareBtn).toBeVisible({ timeout: 8_000 });
    await compareBtn.click();
    await expect(page.getByText(/creator comparison/i)).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Dashboard — date range presets', () => {
  test('dashboard loads KPI cards', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await expect(page.getByText(/attributed revenue/i)).toBeVisible({ timeout: 12_000 });
  });

  test('date range picker shows presets', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/dashboard');
    // Last 7 days preset button in the layout date picker
    const pickerBtn = page.getByRole('button', { name: /last/i }).first();
    await expect(pickerBtn).toBeVisible({ timeout: 8_000 });
    await pickerBtn.click();
    // Dropdown with presets should appear
    await expect(page.getByText(/last 7 days/i)).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Admin — user management', () => {
  test('admin users page renders', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/admin/users');
    // Page should render (may show 403 or the table, depending on role)
    await expect(page).not.toHaveURL(/login/);
  });
});

test.describe('Intelligence — forecast chart', () => {
  test('intelligence page renders', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/intelligence');
    await expect(page.getByRole('heading', { name: /revenue intelligence/i })).toBeVisible({ timeout: 10_000 });
  });
});
