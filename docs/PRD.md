# Trackfluence — Product Requirements Document (PRD)

> **Version:** 1.0 | **Date:** May 2026 | **Status:** Production-ready

---

## 1. Executive Summary

Trackfluence is a **B2B SaaS revenue attribution and intelligence platform** built for brands that grow through creator-led marketing. It bridges the gap between influencer activity and measurable revenue — enabling brands to attribute sales to specific creators, score creator performance, automate payouts, and activate creator-acquired audiences in downstream systems.

**The core problem:** Brands spend on creators but cannot prove ROI, calculate fair commission, or understand LTV of creator-acquired customers.

**The solution:** A closed-loop system where every creator link click is tied to a revenue event through multi-touch attribution, producing actionable intelligence and automated financial workflows.

---

## 2. Goals & Success Metrics

### Business Goals

| Goal | Metric | Target |
|------|--------|--------|
| Reduce creator ROI ambiguity | Attribution Rate | > 60% of revenue attributed |
| Automate payout workflows | Manual payout time | < 2 minutes per creator |
| Grow platform revenue | MRR growth | 20% MoM during scale phase |
| Reduce churn | Net Revenue Retention | > 110% |

### Product Goals

| Goal | Metric | Target |
|------|--------|--------|
| Accurate attribution | Attribution confidence | < 5% false attribution rate |
| Creator engagement | Portal weekly active rate | > 40% of invited creators |
| Data freshness | KPI dashboard lag | < 5 minutes |
| Reliability | API uptime | 99.9% |

---

## 3. User Personas

### Persona 1: The Performance Marketing Manager

**Name:** Jordan, 31, Brand Performance Lead  
**Company:** DTC e-commerce brand, $5M–$50M ARR  
**Situation:** Runs a roster of 20–80 creators/affiliates. Currently tracking performance via spreadsheets, UTM parameters in GA4, and manual Stripe reconciliation.

**Pain Points:**
- No visibility into which creator actually drove a purchase vs just a click
- Payout calculation takes 3+ hours at month-end
- Cannot tell which creators have the best LTV customers (not just volume)

**Goals with Trackfluence:**
- See creator ROI in one dashboard
- Auto-calculate and batch-approve payouts in < 5 minutes
- Find hidden "diamond" creators driving high-LTV customers

**Key features used:** Revenue Intelligence dashboard, Payout automation, Creator scores

---

### Persona 2: The Influencer Program Coordinator

**Name:** Priya, 27, Creator Partnerships Coordinator  
**Company:** Mid-market retail brand  
**Situation:** Manages creator relationships, sends links, monitors compliance.

**Pain Points:**
- Creating individual tracking links for each creator takes 20+ min/week
- FTC disclosure violations expose the brand to legal risk
- Creators ask "how am I performing?" with no self-serve answer

**Goals with Trackfluence:**
- Generate tracking links in bulk in seconds
- Run FTC compliance checks before content goes live
- Give creators a portal to see their own numbers without sharing the main dashboard

**Key features used:** Tracking link generator, FTC compliance, Creator portal

---

### Persona 3: The Finance Director

**Name:** Marcus, 44, Director of Finance  
**Company:** Enterprise brand, $100M+ revenue  
**Situation:** Oversees creator commission payouts. Current process: spreadsheet → manual Stripe transfer → manual receipt.

**Pain Points:**
- No audit trail for commission decisions
- Difficult to reconcile attributed revenue against payout amounts
- Multi-currency creator roster adds FX complexity

**Goals with Trackfluence:**
- Approve payouts with one click with full audit trail
- Export payout CSVs directly for accounting system import
- Multi-currency visibility in one view

**Key features used:** Payout workflow, CSV exports, Audit logs, Currency breakdown

---

### Persona 4: The Creator / Affiliate

**Name:** Alex, 24, Lifestyle content creator  
**Company:** Self-employed, 150K Instagram followers  
**Situation:** Promotes 3–5 brands, wants to prove value to negotiate higher rates.

**Pain Points:**
- No visibility into how many sales their content actually drove
- Gets paid late or with unexplained amounts
- No data to back up rate negotiation

**Goals with Trackfluence:**
- Log into a portal to see clicks, conversions, revenue, and pending payouts
- Download a summary to share with prospective brand partners

**Key features used:** Creator portal (public `/portal?token=...`)

---

## 4. User Stories

### Authentication

| ID | Story | Priority | Status |
|----|-------|----------|--------|
| AUTH-01 | As a user, I can register with email + password so I can access the platform | P0 | ✅ Done |
| AUTH-02 | As a user, I can log in and receive a JWT so I stay authenticated | P0 | ✅ Done |
| AUTH-03 | As a user, I can request a password reset link via email | P0 | ✅ Done |
| AUTH-04 | As a user, my session persists across browser refreshes (localStorage) | P0 | ✅ Done |
| AUTH-05 | As a user, unauthenticated page visits redirect me to /login | P0 | ✅ Done |

### Creator Management

| ID | Story | Priority | Status |
|----|-------|----------|--------|
| CR-01 | As a manager, I can add creators manually with name, email, platform, commission rate | P0 | ✅ Done |
| CR-02 | As a manager, I can import a CSV of creators in bulk | P0 | ✅ Done |
| CR-03 | As a manager, I can send a portal invite email to a creator | P0 | ✅ Done |
| CR-04 | As a creator, I can access my portal with a token link (no login) | P0 | ✅ Done |
| CR-05 | As a creator, I can see my click count, revenue, and payout history in the portal | P0 | ✅ Done |
| CR-06 | As a manager, I can compare two creators side by side | P1 | ✅ Done |
| CR-07 | As a manager, I can update a creator's commission rate | P0 | ✅ Done |

### Campaign Management

| ID | Story | Priority | Status |
|----|-------|----------|--------|
| CAM-01 | As a manager, I can create a campaign with budget, start/end dates, and assigned creators | P0 | ✅ Done |
| CAM-02 | As a manager, I can see campaign-level ROI (revenue / budget) | P0 | ✅ Done |
| CAM-03 | As a manager, I can create A/B variant tracking links within a campaign | P1 | ✅ Done |
| CAM-04 | As a manager, I can view A/B variant conversion rates side by side | P1 | ✅ Done |

### Attribution

| ID | Story | Priority | Status |
|----|-------|----------|--------|
| ATTR-01 | As a manager, I can generate a tracking link for a creator + campaign | P0 | ✅ Done |
| ATTR-02 | Clicking a tracking link records the click, sets session cookie, and redirects | P0 | ✅ Done |
| ATTR-03 | As a dev, I can POST a server-side purchase event to ingest revenue | P0 | ✅ Done |
| ATTR-04 | As a manager, I can choose First Touch, Last Touch, Linear, or Time Decay attribution | P0 | ✅ Done |
| ATTR-05 | Revenue is automatically split across touchpoints per the selected model | P0 | ✅ Done |
| ATTR-06 | Shopify order webhooks are automatically attributed to creators | P0 | ✅ Done |

### Revenue Intelligence

| ID | Story | Priority | Status |
|----|-------|----------|--------|
| RI-01 | As a manager, I can see total revenue, attributed revenue, and attribution rate on a dashboard | P0 | ✅ Done |
| RI-02 | As a manager, I can see a ROAS leaderboard by creator | P0 | ✅ Done |
| RI-03 | As a manager, each creator has a 0–100 performance score with a Platinum/Gold/Silver/Bronze tier | P1 | ✅ Done |
| RI-04 | As a manager, I can see a 3-month revenue forecast based on historical data | P1 | ✅ Done |
| RI-05 | As a manager, I can see revenue by currency | P1 | ✅ Done |
| RI-06 | As a manager, I can run cohort analysis on creator-acquired customers | P1 | ✅ Done |

### Payouts

| ID | Story | Priority | Status |
|----|-------|----------|--------|
| PAY-01 | As finance, I can see a list of all pending payouts with calculated amounts | P0 | ✅ Done |
| PAY-02 | As finance, I can approve individual payouts | P0 | ✅ Done |
| PAY-03 | As finance, I can bulk-approve all PENDING payouts | P0 | ✅ Done |
| PAY-04 | As finance, I can mark approved payouts as paid | P0 | ✅ Done |
| PAY-05 | As finance, I can export payouts to CSV | P0 | ✅ Done |
| PAY-06 | As finance, I can see the payout calculation formula before approving | P0 | ✅ Done |

### Audiences

| ID | Story | Priority | Status |
|----|-------|----------|--------|
| AUD-01 | As a marketing manager, I can build a rule-based audience segment | P1 | ✅ Done |
| AUD-02 | I can compute audience membership on demand | P1 | ✅ Done |
| AUD-03 | I can export an audience to Salesforce | P1 | ✅ Done |
| AUD-04 | I can export an audience to Shopify customer tags | P1 | ✅ Done |
| AUD-05 | I can download audience as CSV | P1 | ✅ Done |

### FTC Compliance

| ID | Story | Priority | Status |
|----|-------|----------|--------|
| COMP-01 | As a coordinator, I can run an FTC check on creator content text | P0 | ✅ Done |
| COMP-02 | Violations automatically trigger an email to the creator | P0 | ✅ Done |
| COMP-03 | I can view a compliance summary for all creators | P1 | ✅ Done |

### Billing

| ID | Story | Priority | Status |
|----|-------|----------|--------|
| BILL-01 | As a user, I can view the available subscription plans | P0 | ✅ Done |
| BILL-02 | I can upgrade via Stripe Checkout | P0 | ✅ Done |
| BILL-03 | I can manage my subscription in the Stripe billing portal | P0 | ✅ Done |
| BILL-04 | Plan limits are enforced (e.g. max creators, max links) | P0 | ✅ Done |

### Organizations

| ID | Story | Priority | Status |
|----|-------|----------|--------|
| ORG-01 | As an owner, I can invite team members by email with a role | P0 | ✅ Done |
| ORG-02 | As a team member, I can accept an invite and join the organization | P0 | ✅ Done |
| ORG-03 | Role-based access controls are enforced per endpoint | P0 | ✅ Done |
| ORG-04 | I can configure a Slack webhook for org-level notifications | P1 | ✅ Done |

### Admin

| ID | Story | Priority | Status |
|----|-------|----------|--------|
| ADM-01 | As a platform admin, I can view all users | P0 | ✅ Done |
| ADM-02 | I can suspend or delete a user | P0 | ✅ Done |
| ADM-03 | I can flush the Redis cache | P1 | ✅ Done |
| ADM-04 | All admin actions are logged in an audit trail | P0 | ✅ Done |
| ADM-05 | I cannot suspend, delete, or change my own role | P0 | ✅ Done |

---

## 5. Non-Functional Requirements (NFRs)

### Performance

| Requirement | Target |
|-------------|--------|
| API response time (p95) | < 300ms for read endpoints |
| Attribution run time | < 2s for a single order with ≤ 100 touchpoints |
| Dashboard KPI load | < 1s with Redis caching |
| Webhook delivery | Best-effort, < 30s delay |
| Real-time push notification | < 500ms after event |

### Scalability

| Requirement | Target |
|-------------|--------|
| Concurrent API requests | 500 req/s (horizontal scaling via Railway) |
| Tracking link clicks | 1,000 clicks/s (link redirect is stateless) |
| Database records | 10M+ attributions, 100M+ events |
| Queue throughput | 10,000 jobs/hour (BullMQ) |

### Reliability

| Requirement | Target |
|-------------|--------|
| API uptime | 99.9% (3-nines) |
| Database redundancy | Railway managed PostgreSQL with automated backups |
| Queue persistence | Redis AOF + replication |
| Error monitoring | All exceptions reported to Sentry |

### Security

| Requirement | Measure |
|-------------|---------|
| Authentication | JWT HS256, 7-day expiry |
| Password storage | bcrypt rounds=12 |
| Stripe webhooks | `constructEvent()` raw body verification |
| Outbound webhooks | HMAC-SHA256 signature |
| Input validation | class-validator whitelist + forbidNonWhitelisted |
| Container security | Non-root Docker users (`nestjs`, `nextjs`) |
| CORS | Explicit origin allowlist |

### Compliance

| Requirement | Measure |
|-------------|---------|
| FTC compliance | Built-in disclosure detection + violation emails |
| GDPR-ready | Customer identity anonymization capability |
| Audit trail | All admin actions logged with actor + IP |
| Data retention | Soft-delete pattern on critical records |

### Usability

| Requirement | Target |
|-------------|--------|
| Mobile responsiveness | Full Tailwind responsive layout |
| Accessibility | Radix UI primitives (screen reader compatible) |
| Time to first insight | < 10 minutes from signup to first attributed revenue |
| Creator portal | Zero-login token URL — works without a platform account |

---

## 6. Out of Scope (v1.0)

The following are explicitly out of scope for the current release:

- Native mobile app (iOS / Android)
- Direct Stripe payout disbursement (finance marks as paid manually)
- Automated FX conversion for multi-currency payouts
- TikTok / Pinterest native API integrations
- AI-generated content performance recommendations
- Multi-org switching in a single session
- Blockchain-based attribution proof
- White-label full rebrand (domain settings only in v1)

---

## 7. Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|-----------|
| Shopify webhook schema changes | Breaking order ingest | Pin to `2024-01` API version, regression tests |
| Stripe API version changes | Billing failures | Pin to `2026-05-27.dahlia`, monitor changelog |
| Railway PostgreSQL backup | Data loss | Automated daily backups, test restore quarterly |
| Redis failure | Cache + queue unavailable | Falls back to in-memory cache in development; production Redis must have replication |
| Salesforce OAuth token expiry | Audience exports fail | Refresh token logic in `OAuthToken` model |
| Meta CAPI event matching | Poor attribution accuracy | Multi-signal identity resolution (email + fbp + fbc) |

---

*PRD generated May 2026 — Trackfluence v1.0*
