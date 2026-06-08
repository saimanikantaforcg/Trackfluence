# Trackfluence — Product Backlog (Jira-Style Epics)

> **Version:** 1.0 | **Date:** May 2026  
> Format: Epic → Story → Acceptance Criteria

---

## How to Read This Document

- **Epic:** Large feature area (quarter-level)
- **Story:** User-facing deliverable (sprint-level)
- **AC:** Acceptance criteria (done definition)
- **Priority:** P0 (blocking) · P1 (high) · P2 (medium) · P3 (nice to have)
- **Status:** ✅ Done · 🔜 Planned · 💡 Idea

---

## EPIC-01: Core Attribution Engine ✅

> **Goal:** Enable accurate click-to-revenue attribution  
> **Status:** Complete

| Story | Priority | Status | Points |
|-------|----------|--------|--------|
| TF-001: Generate tracking links with UTM + short code | P0 | ✅ | 3 |
| TF-002: Record click on redirect with session cookie | P0 | ✅ | 2 |
| TF-003: Ingest server-side purchase events (CAPI format) | P0 | ✅ | 3 |
| TF-004: Shopify webhook order ingest + HMAC verification | P0 | ✅ | 3 |
| TF-005: Identity resolution (email + session + FBP/FBC) | P0 | ✅ | 5 |
| TF-006: First Touch attribution model | P0 | ✅ | 2 |
| TF-007: Last Touch attribution model | P0 | ✅ | 2 |
| TF-008: Linear attribution model | P0 | ✅ | 3 |
| TF-009: Time Decay attribution model | P1 | ✅ | 3 |
| TF-010: Attribution window config (30-day click, 1-day view) | P0 | ✅ | 2 |

**AC for TF-002:**
- [x] Click recorded with timestamp, creatorId, sessionId, UTM params
- [x] `__tf_session` cookie set with 30-day expiry
- [x] Redirect happens within 200ms
- [x] Deduplication prevents double-counting the same click

**AC for TF-005:**
- [x] Email SHA-256 hash matches customer record
- [x] FBP/FBC cookies matched to CustomerIdentity
- [x] Session ID matched to TouchPoint
- [x] Most-confident identity type wins on conflict

---

## EPIC-02: Creator Management ✅

> **Goal:** Full creator roster management with portal access  
> **Status:** Complete

| Story | Priority | Status | Points |
|-------|----------|--------|--------|
| TF-011: Create creator with commission rate | P0 | ✅ | 2 |
| TF-012: Bulk CSV creator import (upsert) | P0 | ✅ | 3 |
| TF-013: Creator portal invite email | P0 | ✅ | 2 |
| TF-014: Token-gated creator portal (no login) | P0 | ✅ | 3 |
| TF-015: Creator portal — clicks, revenue, payouts, chart | P0 | ✅ | 5 |
| TF-016: Creator A/B variant tracking link | P1 | ✅ | 3 |
| TF-017: Creator comparison drawer (side-by-side) | P1 | ✅ | 2 |
| TF-018: Update creator commission rate | P0 | ✅ | 1 |

**AC for TF-014:**
- [x] Portal accessible at `/portal?token=<invite_token>`
- [x] Invalid/expired token returns 401
- [x] Token is single-use after acceptance
- [x] Portal does not expose other creators' data

---

## EPIC-03: Campaign Management ✅

> **Goal:** Organize creators into campaigns with budget tracking  
> **Status:** Complete

| Story | Priority | Status | Points |
|-------|----------|--------|--------|
| TF-019: Create campaign with budget + dates | P0 | ✅ | 2 |
| TF-020: Assign creators to campaigns | P0 | ✅ | 2 |
| TF-021: Campaign ROI stats (revenue / budget) | P0 | ✅ | 3 |
| TF-022: A/B variant links within campaign | P1 | ✅ | 3 |
| TF-023: A/B variant CVR comparison | P1 | ✅ | 2 |
| TF-024: Campaign update / delete | P0 | ✅ | 1 |

---

## EPIC-04: Revenue Intelligence Dashboard ✅

> **Goal:** Real-time KPI visibility and creator performance scoring  
> **Status:** Complete

| Story | Priority | Status | Points |
|-------|----------|--------|--------|
| TF-025: KPI dashboard — revenue, attribution rate, AOV | P0 | ✅ | 5 |
| TF-026: Creator ROAS leaderboard | P0 | ✅ | 3 |
| TF-027: Creator performance scores (0–100) | P1 | ✅ | 5 |
| TF-028: Creator tier badges (Platinum/Gold/Silver/Bronze) | P1 | ✅ | 2 |
| TF-029: Revenue forecast (linear regression, 3-month) | P1 | ✅ | 5 |
| TF-030: Cohort analysis (creator-acquired customers) | P1 | ✅ | 5 |
| TF-031: Revenue time series chart | P0 | ✅ | 3 |
| TF-032: Multi-currency revenue breakdown | P1 | ✅ | 3 |
| TF-033: Dashboard date range filter | P0 | ✅ | 2 |

**AC for TF-027:**
- [x] Score = revenue_share×50% + conversion_share×30% + click_share×20%
- [x] Score updates on new attribution events
- [x] Score is cached in Redis (max 5-min staleness)
- [x] Scores exposed on GET `/revenue-intelligence/creators/scores`

---

## EPIC-05: Payout Automation ✅

> **Goal:** Automate commission calculation and payout workflow  
> **Status:** Complete

| Story | Priority | Status | Points |
|-------|----------|--------|--------|
| TF-034: Calculate estimated payout for a creator + period | P0 | ✅ | 3 |
| TF-035: Create payout record | P0 | ✅ | 2 |
| TF-036: Approve individual payout | P0 | ✅ | 1 |
| TF-037: Bulk approve all PENDING payouts | P0 | ✅ | 2 |
| TF-038: Mark payout as PAID | P0 | ✅ | 1 |
| TF-039: Cancel payout | P0 | ✅ | 1 |
| TF-040: Export payouts to CSV | P0 | ✅ | 2 |
| TF-041: Payout status history log | P1 | ✅ | 2 |

**AC for TF-037:**
- [x] Only PENDING payouts can be bulk approved
- [x] APPROVED payouts appear in finance export
- [x] Webhook `payout.approved` fires for each approved payout
- [x] Slack notification sent if org has Slack webhook configured

---

## EPIC-06: Audience Segmentation ✅

> **Goal:** Build and activate creator-acquired customer segments  
> **Status:** Complete

| Story | Priority | Status | Points |
|-------|----------|--------|--------|
| TF-042: Create rule-based audience segment | P1 | ✅ | 3 |
| TF-043: Compute audience membership on demand | P1 | ✅ | 3 |
| TF-044: Export audience to Salesforce | P1 | ✅ | 3 |
| TF-045: Export audience to Shopify | P1 | ✅ | 2 |
| TF-046: Export audience to Salesforce Data Cloud | P2 | ✅ | 3 |
| TF-047: Export audience to SFMC | P2 | ✅ | 2 |
| TF-048: Download audience as CSV | P1 | ✅ | 1 |
| TF-049: Delete audience segment | P1 | ✅ | 1 |

---

## EPIC-07: FTC Compliance ✅

> **Goal:** Proactively detect and remediate FTC disclosure violations  
> **Status:** Complete

| Story | Priority | Status | Points |
|-------|----------|--------|--------|
| TF-050: FTC check via content text analysis | P0 | ✅ | 3 |
| TF-051: Auto-email creator on violation | P0 | ✅ | 2 |
| TF-052: Compliance summary dashboard | P1 | ✅ | 2 |
| TF-053: Per-creator compliance history | P1 | ✅ | 2 |

**AC for TF-051:**
- [x] Email sent only when `isCompliant = false`
- [x] Email contains creator name, content URL, specific issues
- [x] Email links to FTC guidelines
- [x] Email failure does not crash the check request

---

## EPIC-08: Organizations & Multi-Tenancy ✅

> **Goal:** Multi-user workspaces with role-based access  
> **Status:** Complete

| Story | Priority | Status | Points |
|-------|----------|--------|--------|
| TF-054: Create organization | P0 | ✅ | 2 |
| TF-055: Invite team member with email + role | P0 | ✅ | 3 |
| TF-056: Accept invite flow | P0 | ✅ | 2 |
| TF-057: Remove team member | P0 | ✅ | 1 |
| TF-058: Role-based endpoint guards | P0 | ✅ | 3 |
| TF-059: Configure Slack webhook URL | P1 | ✅ | 2 |
| TF-060: Configure Discord webhook URL | P1 | ✅ | 2 |
| TF-061: Configure custom tracking domain | P1 | ✅ | 2 |

---

## EPIC-09: Billing & Subscriptions ✅

> **Goal:** Stripe-powered plan management  
> **Status:** Complete

| Story | Priority | Status | Points |
|-------|----------|--------|--------|
| TF-062: List available plans with limits | P0 | ✅ | 1 |
| TF-063: Create Stripe Checkout session | P0 | ✅ | 3 |
| TF-064: Handle Stripe webhook for subscription events | P0 | ✅ | 3 |
| TF-065: Open Stripe Billing Portal | P0 | ✅ | 2 |
| TF-066: Enforce plan limits (max creators, links, etc.) | P0 | ✅ | 5 |

---

## EPIC-10: Platform Administration ✅

> **Goal:** System management for platform admins  
> **Status:** Complete

| Story | Priority | Status | Points |
|-------|----------|--------|--------|
| TF-067: View all platform users | P0 | ✅ | 1 |
| TF-068: Change user role | P0 | ✅ | 1 |
| TF-069: Suspend user (downgrade to VIEWER) | P0 | ✅ | 2 |
| TF-070: Hard delete user | P0 | ✅ | 2 |
| TF-071: Self-protection (cannot change own role/suspend/delete) | P0 | ✅ | 2 |
| TF-072: System stats (users, creators, orders, attributions) | P0 | ✅ | 2 |
| TF-073: Flush Redis cache | P1 | ✅ | 1 |
| TF-074: Admin audit log | P0 | ✅ | 3 |

---

## EPIC-11: Authentication & Security ✅

> **Goal:** Secure authentication and authorization layer  
> **Status:** Complete

| Story | Priority | Status | Points |
|-------|----------|--------|--------|
| TF-075: Register with email + password (bcrypt-12) | P0 | ✅ | 2 |
| TF-076: Login → JWT (7-day) | P0 | ✅ | 2 |
| TF-077: Password reset via email token | P0 | ✅ | 3 |
| TF-078: Edge middleware JWT auth for all protected pages | P0 | ✅ | 3 |
| TF-079: API key generation (SHA-256 hash storage) | P1 | ✅ | 3 |
| TF-080: API key revocation | P1 | ✅ | 1 |
| TF-081: Global rate limiting (200 req/60s per user) | P0 | ✅ | 3 |
| TF-082: CORS allowlist | P0 | ✅ | 1 |

---

## EPIC-12: Webhooks & Real-Time ✅

> **Goal:** Event-driven integrations and real-time notifications  
> **Status:** Complete

| Story | Priority | Status | Points |
|-------|----------|--------|--------|
| TF-083: Create outbound webhook with HMAC secret | P1 | ✅ | 3 |
| TF-084: Deliver webhook on 21 event types | P1 | ✅ | 5 |
| TF-085: Log webhook delivery (success/failure) | P1 | ✅ | 2 |
| TF-086: Retry failed webhook delivery | P1 | ✅ | 2 |
| TF-087: Toggle webhook active/disabled | P1 | ✅ | 1 |
| TF-088: Socket.io real-time gateway | P1 | ✅ | 3 |
| TF-089: Push ATTRIBUTION_CREATED event via Socket.io | P1 | ✅ | 2 |
| TF-090: Push PAYOUT_UPDATED event via Socket.io | P1 | ✅ | 2 |

---

## EPIC-13: Integrations ✅

> **Goal:** Connect to brand's existing tools  
> **Status:** Complete

| Story | Priority | Status | Points |
|-------|----------|--------|--------|
| TF-091: Shopify order webhook (HMAC verified) | P0 | ✅ | 3 |
| TF-092: Salesforce OAuth 2.0 integration | P1 | ✅ | 5 |
| TF-093: Meta CAPI server-side event endpoint | P0 | ✅ | 3 |
| TF-094: Stripe subscription billing | P0 | ✅ | 5 |
| TF-095: Resend transactional email | P0 | ✅ | 3 |
| TF-096: PostHog product analytics events | P1 | ✅ | 2 |
| TF-097: Sentry error monitoring (API + Web) | P1 | ✅ | 2 |

---

## EPIC-14: Developer Experience ✅

> **Goal:** SDK, docs, and developer tooling  
> **Status:** Complete

| Story | Priority | Status | Points |
|-------|----------|--------|--------|
| TF-098: Swagger / OpenAPI docs at `/api/docs` | P0 | ✅ | 2 |
| TF-099: OpenAPI YAML spec | P1 | ✅ | 3 |
| TF-100: Global search endpoint (creators + customers + links) | P1 | ✅ | 2 |
| TF-101: CSV attribution report export | P1 | ✅ | 2 |
| TF-102: Health check endpoint | P0 | ✅ | 1 |
| TF-103: Bull Board queue monitor at `/api/admin/queues` | P1 | ✅ | 1 |

---

## EPIC-15: Deployment & Infrastructure ✅

> **Goal:** Production-ready deployment on Railway  
> **Status:** Complete

| Story | Priority | Status | Points |
|-------|----------|--------|--------|
| TF-104: Multi-stage Dockerfile for API (non-root) | P0 | ✅ | 2 |
| TF-105: Multi-stage Dockerfile for Web (standalone output) | P0 | ✅ | 2 |
| TF-106: Railway.toml for API and Web | P0 | ✅ | 1 |
| TF-107: Docker Compose for local dev stack | P0 | ✅ | 1 |
| TF-108: Production Docker Compose | P0 | ✅ | 1 |
| TF-109: start.sh with migrate/push fallback | P0 | ✅ | 2 |
| TF-110: Smoke test script (PowerShell) | P1 | ✅ | 2 |

---

## EPIC-16: Stripe Connect Payouts 🔜 P0

> **Goal:** Actual money movement to creators via Stripe Connect  
> **Status:** Planned (highest priority gap)

| Story | Priority | Status | Points |
|-------|----------|--------|--------|
| TF-111: Creator Stripe Connect onboarding | P0 | 🔜 | 8 |
| TF-112: Create Stripe Transfer on payout approval | P0 | 🔜 | 5 |
| TF-113: Stripe Connect webhook for transfer events | P0 | 🔜 | 3 |
| TF-114: Creator bank verification status UI | P0 | 🔜 | 3 |
| TF-115: Payout failure handling + retry | P1 | 🔜 | 3 |

---

## EPIC-17: MFA & Enhanced Security 🔜 P1

> **Goal:** Multi-factor authentication for all accounts  
> **Status:** Planned

| Story | Priority | Status | Points |
|-------|----------|--------|--------|
| TF-116: TOTP setup (QR code + secret) | P1 | 🔜 | 5 |
| TF-117: TOTP verification on login | P1 | 🔜 | 3 |
| TF-118: Recovery codes | P1 | 🔜 | 2 |
| TF-119: Org-level MFA enforcement | P2 | 🔜 | 2 |

---

## EPIC-18: AI Creator Recommendations 💡 P1

> **Goal:** Predictive intelligence for creator selection and budget  
> **Status:** Idea / Future

| Story | Priority | Status | Points |
|-------|----------|--------|--------|
| TF-120: Creator-product affinity scoring | P1 | 💡 | 13 |
| TF-121: Budget allocation optimizer | P2 | 💡 | 13 |
| TF-122: Creator churn risk prediction | P2 | 💡 | 8 |
| TF-123: Anomaly detection (CVR drop alerts) | P1 | 💡 | 8 |

---

## EPIC-19: Mobile / PWA 🔜 P1

> **Goal:** Install-able PWA for creator portal  
> **Status:** Planned

| Story | Priority | Status | Points |
|-------|----------|--------|--------|
| TF-124: Enable service worker registration | P1 | 🔜 | 3 |
| TF-125: Add to Home Screen prompt | P1 | 🔜 | 2 |
| TF-126: Offline creator portal (cache-first) | P1 | 🔜 | 3 |
| TF-127: Push notifications for payouts (Web Push API) | P2 | 🔜 | 5 |

---

## EPIC-20: Social Platform APIs 💡 P2

> **Goal:** Pull content metrics from creator social platforms  
> **Status:** Idea / Future

| Story | Priority | Status | Points |
|-------|----------|--------|--------|
| TF-128: Instagram Creator API — view/reach metrics | P2 | 💡 | 8 |
| TF-129: TikTok Research API — video view data | P2 | 💡 | 8 |
| TF-130: YouTube Data API — video stats | P2 | 💡 | 8 |
| TF-131: TikTok Shop order webhook | P1 | 💡 | 8 |
| TF-132: Content performance score component | P2 | 💡 | 5 |

---

## Sprint Velocity Summary

| Epic | Total Points | Status |
|------|-------------|--------|
| Core Attribution (01) | 28 | ✅ Complete |
| Creator Management (02) | 21 | ✅ Complete |
| Campaign Management (03) | 13 | ✅ Complete |
| Revenue Intelligence (04) | 33 | ✅ Complete |
| Payout Automation (05) | 15 | ✅ Complete |
| Audience Segmentation (06) | 18 | ✅ Complete |
| FTC Compliance (07) | 9 | ✅ Complete |
| Organizations (08) | 17 | ✅ Complete |
| Billing (09) | 14 | ✅ Complete |
| Administration (10) | 14 | ✅ Complete |
| Auth & Security (11) | 19 | ✅ Complete |
| Webhooks & Real-time (12) | 20 | ✅ Complete |
| Integrations (13) | 23 | ✅ Complete |
| Developer Experience (14) | 11 | ✅ Complete |
| Deployment (15) | 11 | ✅ Complete |
| **Stripe Connect Payouts (16)** | 22 | 🔜 Next |
| MFA (17) | 12 | 🔜 Planned |
| AI Recommendations (18) | 42 | 💡 Future |
| Mobile/PWA (19) | 13 | 🔜 Planned |
| Social APIs (20) | 37 | 💡 Future |
| **v1.0 TOTAL** | **266** | ✅ **All done** |

---

*Backlog v1.0 — May 2026 — Trackfluence*
