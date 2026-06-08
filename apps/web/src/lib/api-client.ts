/**
 * Typed API client using openapi-fetch.
 *
 * To regenerate types after API changes run:
 *   pnpm sdk:generate   (from repo root)
 *
 * This file wraps the raw client with convenience methods that
 * automatically attach the Bearer token from localStorage.
 */
import createClient, { type ClientOptions } from 'openapi-fetch';
import type { paths } from './api-types.gen';

// ─── Token helper ────────────────────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tf_token');
}

// ─── Create the typed openapi-fetch client ───────────────────────────────────

function buildClient(opts?: ClientOptions) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  return createClient<paths>({ baseUrl, ...opts });
}

// ─── Auth-aware middleware ────────────────────────────────────────────────────

const rawClient = buildClient();

// Attach Bearer token to every request
rawClient.use({
  onRequest({ request }) {
    const token = getToken();
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
    return request;
  },
});

// ─── Typed client re-export ───────────────────────────────────────────────────

export const apiClient = rawClient;

// ─── Per-org helper ───────────────────────────────────────────────────────────

/**
 * Returns a client pre-populated with the X-Organization-Id header.
 */
export function orgClient(orgId: string) {
  const client = buildClient();
  client.use({
    onRequest({ request }) {
      const token = getToken();
      if (token) request.headers.set('Authorization', `Bearer ${token}`);
      request.headers.set('X-Organization-Id', orgId);
      return request;
    },
  });
  return client;
}
