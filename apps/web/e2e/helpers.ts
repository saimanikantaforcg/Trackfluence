import { type Page, expect } from '@playwright/test';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Register a fresh user and return token — uses direct API call, no UI. */
export async function registerUser(
  page: Page,
  opts: { name?: string; email?: string; password?: string } = {},
) {
  const name = opts.name ?? `Test User ${Date.now()}`;
  const email = opts.email ?? `test_${Date.now()}@example.com`;
  const password = opts.password ?? 'Password123!';

  const res = await page.request.post(`${API}/api/v1/auth/register`, {
    data: { name, email, password },
  });
  const body = (await res.json()) as { token: string; user: { id: string; email: string; role: string } };
  return { token: body.token, user: body.user, email, password };
}

/** Login via the UI form and wait for dashboard redirect. */
export async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10_000 });
}

/** Inject JWT into localStorage so we skip the login UI. */
export async function injectToken(page: Page, token: string) {
  await page.goto('/login');
  await page.evaluate((t) => localStorage.setItem('tf_token', t), token);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/dashboard/);
}
