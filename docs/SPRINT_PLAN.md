# Trackfluence — Sprint Plan

> Derived from the Senior Product Architect Audit (2026-07-09).
> Each sprint is sized for ~1 week. Items are ordered by dependency and risk.

---

## Sprint 1 — Security Blockers

**Goal:** Close all critical vulnerabilities before any production traffic.

| # | Task | File(s) | Effort | Priority |
|---|------|---------|--------|----------|
| 1.1 | Protect Bull Board behind admin JWT middleware | `apps/api/src/main.ts` | 1h | P0 |
| 1.2 | Verify JWT signature in Next.js Edge middleware (use `jose`) | `apps/web/src/middleware.ts` | 2h | P0 |
| 1.3 | Fix server-side API auth forwarding — pass JWT from `cookies()` in RSC fetcher | `apps/web/src/lib/api.ts` | 2h | P1 |
| 1.4 | Encrypt OAuth tokens at app layer (AES-256-GCM) before writing to `OAuthToken` | `apps/api/src/connectors/salesforce/`, new `crypto.util.ts` | 4h | P0 |
| 1.5 | Fix open redirect — validate `destinationUrl` against an allowlist before issuing 302 in tracking link redirect | `apps/api/src/attribution/attribution.controller.ts` | 1h | P0 |
| 1.6 | Add secure cookie / SameSite strategy — set `HttpOnly`, `Secure`, `SameSite=Lax` on `tf_token` cookie at login | `apps/web/src/app/login/`, `apps/api/src/auth/auth.controller.ts` | 2h | P0 |

**Exit Criteria:**
- [ ] Bull Board returns 401 for unauthenticated requests
- [ ] Expired / tampered JWT redirects to `/login` from middleware
- [ ] All Next.js server-component data calls include a valid Bearer token
- [ ] Salesforce tokens are AES-encrypted in the DB
- [ ] Tracking link redirects only to whitelisted domains
- [ ] Auth cookie is `HttpOnly; Secure; SameSite=Lax`

---

## Sprint 2 — Tenant and Data Safety

**Goal:** Ensure no authenticated user can read or mutate another organisation's data.

| # | Task | File(s) | Effort | Priority |
|---|------|---------|--------|----------|
| 2.1 | Enforce `organizationId` scoping in all services — extract org from JWT and inject as mandatory `where` clause | `creators/`, `campaigns/`, `audience/`, `payouts/`, `attribution/`, `compliance/` services | 2d | P1 |
| 2.2 | Add cross-tenant access tests — verify that User A cannot read Org B's data | `apps/api/test/` (new e2e suite) | 1d | P1 |
| 2.3 | Make API keys org-scoped — add `organizationId` to `ApiKey` model; validate org membership on key use | `apps/api/src/api-keys/`, `schema.prisma` | 4h | P1 |
| 2.4 | Fix `acquisitionCreatorId` field name mismatch in `AudienceService` (schema: `acquisitionCreatorId`, code: `acquiredByCreatorId`) | `apps/api/src/audience/audience.service.ts` | 30min | P1 |
| 2.5 | Replace fake Shopify placeholder email — use `SHOPIFY_ID` identity type only for emailless customers | `apps/api/src/connectors/shopify/shopify.service.ts` | 1h | P1 |
| 2.6 | Add data-access helper / Prisma extension to automatically scope queries by `organizationId` (prevent future leaks) | `packages/database/src/`, new `org-scope.extension.ts` | 4h | P1 |

**Exit Criteria:**
- [ ] All service queries include `organizationId` from JWT context
- [ ] Cross-tenant e2e tests pass and are added to CI
- [ ] API keys are scoped to the issuing organisation
- [ ] `AudienceService` `creatorId` rule works without runtime error
- [ ] No `@placeholder.local` emails in the customer identity graph
- [ ] Prisma extension enforces org scope at the ORM level

---

## Sprint 3 — Attribution Trust

**Goal:** Make the attribution engine correct, idempotent, and financially auditable.

| # | Task | File(s) | Effort | Priority |
|---|------|---------|--------|----------|
| 3.1 | Fix money / decimal model — replace all `Number()` casts on `Decimal` with `Prisma.Decimal` arithmetic to avoid float precision loss | `apps/api/src/revenue-attribution/`, `revenue-intelligence/` | 4h | P1 |
| 3.2 | Add Shopify webhook idempotency — reject duplicate `order.paid` events using `deduplicationKey` on `Order.externalId` | `apps/api/src/connectors/shopify/shopify.service.ts` | 2h | P1 |
| 3.3 | Add Stripe webhook idempotency — persist and check `stripeEvent.id` before processing billing events | `apps/api/src/billing/billing.service.ts` | 2h | P1 |
| 3.4 | Add attribution idempotency — prevent duplicate `Attribution` rows for the same `(orderId, creatorId, model)` triple | `apps/api/src/revenue-attribution/revenue-attribution.service.ts` | 2h | P1 |
| 3.5 | Re-enable attribution processor — ensure the BullMQ consumer worker is registered and processing `ATTRIBUTION_QUEUE` jobs end-to-end | `apps/api/src/queue/`, `revenue-attribution/` | 4h | P1 |
| 3.6 | Add attribution recalculation job — scheduled BullMQ job to reprocess orders whose attribution is stale or missing | `apps/api/src/queue/`, new `recalculation.processor.ts` | 1d | P2 |

**Exit Criteria:**
- [ ] No float precision errors in payout or attribution amounts
- [ ] Replaying the same Shopify order webhook produces exactly one `Order` and one set of `Attribution` rows
- [ ] Replaying the same Stripe event is a no-op
- [ ] Attribution rows are deduplicated per `(orderId, creatorId, model)`
- [ ] BullMQ `ATTRIBUTION_QUEUE` consumer processes jobs and emits WebSocket events
- [ ] Scheduled recalculation job runs and back-fills missing attributions

---

## Sprint 4 — Scale and Dashboard Readiness

**Goal:** Ensure the platform handles production data volumes without degradation.

| # | Task | File(s) | Effort | Priority |
|---|------|---------|--------|----------|
| 4.1 | Add composite indexes — `(organizationId, createdAt)` on `Creator`, `Campaign`, `Payout`; `(orderId, creatorId, model)` on `Attribution` | `packages/database/prisma/schema.prisma` + migration | 2h | P2 |
| 4.2 | Push ROAS aggregation to DB — replace `attribution.findMany()` + JS `Map` with `prisma.attribution.groupBy()` | `apps/api/src/revenue-intelligence/revenue-intelligence.service.ts` | 1h | P2 |
| 4.3 | Add cursor-based pagination to all list endpoints — `trackingLinks`, `audiences`, `auditLogs`, `webhookDeliveries`, `creators`, `customers` | multiple controllers + services | 1d | P2 |
| 4.4 | Add webhook retry and DLQ — implement exponential back-off retry (max 3 attempts) and move failed deliveries to a dead-letter queue | `apps/api/src/webhooks/webhooks.service.ts`, `queue/` | 4h | P2 |
| 4.5 | Add Redis / BullMQ health checks — extend `/api/v1/health` to report Redis connectivity and queue depth | `apps/api/src/health/` | 2h | P2 |
| 4.6 | Improve dashboard caching strategy — per-org cache keys, cache invalidation on attribution creation, configurable TTL | `apps/api/src/revenue-intelligence/revenue-intelligence.service.ts`, `cache/` | 4h | P2 |

**Exit Criteria:**
- [ ] Query plans show index usage for all high-traffic queries (`EXPLAIN ANALYZE`)
- [ ] ROAS endpoint uses a single `groupBy` SQL query — no unbounded `findMany`
- [ ] All list endpoints return paginated responses with `nextCursor` / `total`
- [ ] Failed webhook deliveries retry 3× with back-off; exhausted jobs land in DLQ
- [ ] `/api/v1/health` reports Redis status and queue depth
- [ ] Dashboard cache keys are org-scoped and invalidated on new attribution events

---

## Backlog (Post-Sprint 4)

| Item | Notes |
|------|-------|
| Implement OpenAI call in AI Recommendations service | Currently fully mocked even when `OPENAI_API_KEY` is set |
| Add `OPENAI_API_KEY` and `SENTRY_DSN` to Joi env validation | Missing from `env.validation.ts` |
| Replace `Campaign.creatorIds String[]` with join table | Requires migration + backfill |
| FTC compliance URL scraping | `contentUrl` stored but never fetched |
| Multi-currency FX conversion in payouts | Amounts stored per-currency but no conversion logic |
| Fix deprecated `moduleResolution: "node"` in `apps/api/tsconfig.json` | TS 7 will break |
| Deduplicate `APP_URL` / `APP_BASE_URL` in env schema | Two variables for the same thing |

---

## Definition of Done (All Sprints)

- Code reviewed and merged to `main`
- Unit tests added for all new business logic
- No new TypeScript `any` introduced
- No new ESLint errors
- Migration files committed alongside schema changes
- Environment variable changes documented in `.env.example`
