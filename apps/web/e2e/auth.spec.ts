import { test, expect } from '@playwright/test';

test.describe('Auth — Login page', () => {
  test('renders login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('shows error for wrong credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'nobody@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=/invalid credentials/i')).toBeVisible({ timeout: 8_000 });
  });

  test('has "Forgot password?" link', async ({ page }) => {
    await page.goto('/login');
    const link = page.getByRole('link', { name: /forgot password/i });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/forgot-password/);
  });
});

test.describe('Auth — Register page', () => {
  test('renders register form', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('validates short password', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[name="name"]', 'Tester');
    await page.fill('input[type="email"]', `tester_${Date.now()}@example.com`);
    await page.fill('input[type="password"]', 'short');
    await page.click('button[type="submit"]');
    // HTML5 or server validation triggers — button stays on page
    await expect(page).toHaveURL(/register/);
  });
});

test.describe('Auth — Forgot password page', () => {
  test('renders form', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { name: /forgot your password/i })).toBeVisible();
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible();
  });

  test('shows confirmation after submit', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.fill('input[type="email"]', 'nobody@example.com');
    await page.click('button[type="submit"]');
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 8_000 });
  });
});

test.describe('Auth — Reset password page', () => {
  test('shows invalid link message when no token', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page.getByText(/invalid reset link/i)).toBeVisible({ timeout: 8_000 });
  });

  test('renders form with valid token param', async ({ page }) => {
    await page.goto('/reset-password?token=sometoken');
    await expect(page.getByRole('button', { name: /reset password/i })).toBeVisible({ timeout: 8_000 });
  });
});
