import { test, expect } from '@playwright/test';
import { registerUser, injectToken } from './helpers';

// ─── Creators ───────────────────────────────────────────────

test.describe('Creators page', () => {
  test('renders page heading', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/creators');
    await expect(page.getByRole('heading', { name: /creators/i })).toBeVisible();
  });

  test('shows empty state when no creators exist', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/creators');
    // Either a table or an empty state message
    await expect(
      page.locator('table, text=/no creators/i, text=/add your first/i').first()
    ).toBeVisible({ timeout: 8_000 });
  });
});

test.describe('Campaigns page', () => {
  test('renders page', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/campaigns');
    await expect(page.getByRole('heading', { name: /campaigns/i })).toBeVisible();
  });

  test('shows New Campaign button when authenticated', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/campaigns');
    await expect(page.getByRole('button', { name: /new campaign/i })).toBeVisible({ timeout: 8_000 });
  });
});

test.describe('Payouts page', () => {
  test('renders page', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/payouts');
    await expect(page.getByRole('heading', { name: /payouts/i })).toBeVisible();
  });

  test('commission calculator toggle is visible', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/payouts');
    await expect(page.getByRole('button', { name: /commission calculator/i })).toBeVisible({ timeout: 8_000 });
  });
});

test.describe('Webhooks page', () => {
  test('renders page with register button', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/webhooks');
    await expect(page.getByRole('heading', { name: /webhooks/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /register webhook/i })).toBeVisible();
  });

  test('register webhook modal opens', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/webhooks');
    await page.getByRole('button', { name: /register webhook/i }).click();
    await expect(page.getByPlaceholder(/https:\/\/yourapp/i)).toBeVisible();
  });
});

test.describe('Settings page', () => {
  test('renders page', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
  });

  test('attribution settings section is visible', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/settings');
    await expect(page.getByText(/attribution settings/i)).toBeVisible();
  });
});

// ─── Attribution ─────────────────────────────────────────────

test.describe('Attribution page', () => {
  test('renders page heading', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/attribution');
    await expect(page.getByRole('heading', { name: /attribution infrastructure/i })).toBeVisible();
  });

  test('order attribution lookup section is visible', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/attribution');
    await expect(page.getByText(/order attribution lookup/i)).toBeVisible({ timeout: 8_000 });
  });

  test('new tracking link button is visible', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/attribution');
    await expect(page.getByRole('button', { name: /new tracking link/i })).toBeVisible();
  });
});

// ─── Compliance ──────────────────────────────────────────────

test.describe('Compliance page', () => {
  test('renders page heading', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/compliance');
    await expect(page.getByRole('heading', { name: /compliance/i })).toBeVisible();
  });

  test('Run Check button is visible', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/compliance');
    await expect(page.getByRole('button', { name: /run check/i })).toBeVisible({ timeout: 8_000 });
  });
});

// ─── Audiences ───────────────────────────────────────────────

test.describe('Audiences page', () => {
  test('renders page heading', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/audiences');
    await expect(page.getByRole('heading', { name: /audience/i })).toBeVisible();
  });
});

// ─── Customers ───────────────────────────────────────────────

test.describe('Customers page', () => {
  test('renders page heading', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/customers');
    await expect(page.getByRole('heading', { name: /customers/i })).toBeVisible();
  });

  test('search input is present', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/customers');
    await expect(page.getByPlaceholder(/search by email/i)).toBeVisible({ timeout: 8_000 });
  });
});

// ─── Revenue ─────────────────────────────────────────────────

test.describe('Revenue page', () => {
  test('renders page heading', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/revenue');
    await expect(page.getByRole('heading', { name: /revenue attribution/i })).toBeVisible();
  });

  test('creator leaderboard tab is visible', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/revenue');
    await expect(page.getByText(/creator leaderboard/i)).toBeVisible({ timeout: 8_000 });
  });
});

// ─── Connectors ──────────────────────────────────────────────

test.describe('Connectors page', () => {
  test('renders Shopify connector', async ({ page }) => {
    const { token } = await registerUser(page);
    await injectToken(page, token);
    await page.goto('/connectors');
    await expect(page.getByText(/shopify/i).first()).toBeVisible({ timeout: 8_000 });
  });
});
