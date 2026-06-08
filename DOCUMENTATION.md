# Trackfluence — Full Product Documentation

> Revenue Attribution & Intelligence Platform for Creator-Led Growth

---

## Table of Contents

1. [What is Trackfluence?](#1-what-is-trackfluence)
2. [How It Works — End to End](#2-how-it-works--end-to-end)
3. [Architecture](#3-architecture)
4. [Feature Reference](#4-feature-reference)
5. [API Reference](#5-api-reference)
6. [Data Models](#6-data-models)
7. [Billing Plans](#7-billing-plans)
8. [Security & Auth](#8-security--auth)
9. [Integrations](#9-integrations)
10. [Environment Variables](#10-environment-variables)
11. [Deployment](#11-deployment)
12. [Developer Setup](#12-developer-setup)

---

## 1. What is Trackfluence?

Trackfluence is a **B2B SaaS revenue attribution and intelligence platform** designed for brands that grow through creator-led marketing (influencers, affiliates, ambassadors).

### The Problem It Solves

Most brands have no reliable way to know:
- Which creator actually drove a sale
- What a creator's customers are worth long-term (LTV)
- Which campaigns generate real ROI vs vanity metrics
- How to pay creators fairly based on actual revenue driven

### The Solution

Trackfluence connects creator activity (clicks, content, promo codes) to revenue events (purchases, subscriptions) through a multi-touch attribution engine. Brands can:

- Track creator-generated traffic via unique tracking links
- Attribute revenue to specific creators across the customer journey
- Score creators by revenue impact (not just follower count)
- Automate payout calculation based on commission rates
- Segment audiences acquired through creators
- Forecast revenue and understand creator ROI

---

## 2. How It Works — End to End

### Step 1: Onboard Creators

A brand invites creators to the platform. Each creator gets a profile with:
- Platform (Instagram, TikTok, YouTube, etc.)
- Custom commission rate (e.g. 10%)
- A token-gated creator portal to view their own stats

### Step 2: Create Campaigns

Campaigns group creators under shared goals with budgets and time windows. Each campaign tracks:
- Creator participants
- Budget and currency
- Start/end dates
- A/B variant tracking links (optional)

### Step 3: Generate Tracking Links

For each creator + campaign combination, tracking links are created with:
- 8-character unique short code (e.g. `/r/aB3xYz12`)
- UTM parameters (source, medium, campaign, content, term)
- Optional promo code
- Link type: Standard, Promo Code, QR Code, or Referral

When a customer clicks the link, the system records:
- Click timestamp
- Creator ID
- Campaign ID
- UTM context
- Session ID

### Step 4: Ingest Revenue Events

Revenue data flows in from:
- **Shopify** — via webhook (order created, order paid)
- **Meta CAPI** — server-side purchase events
- **Direct API** — REST event ingestion endpoint
- **Custom** — any server posting to `/api/v1/attribution/server-events`

When an order arrives, the system:
1. Looks up the customer's identity (email, phone, session ID)
2. Finds all touchpoints within the attribution window (30 days for clicks, 1 day for views)
3. Applies the selected attribution model to split revenue credit

### Step 5: Attribution Models

| Model | Logic |
|-------|-------|
| **First Touch** | 100% credit to the creator whose link was clicked first |
| **Last Touch** | 100% credit to the creator whose link was clicked last before purchase |
| **Linear** | Equal credit split across all creators who had touchpoints |
| **Time Decay** | More recent touchpoints get higher credit (exponential decay) |

### Step 6: Revenue Intelligence

Once attributions exist, the platform generates:

- **Dashboard KPIs** — Total revenue, attributed revenue, attribution rate, AOV, click-to-conversion rate
- **Creator Scores** — Each creator scored 0–100 (50% revenue, 30% conversions, 20% clicks) and tiered (Platinum / Gold / Silver / Bronze)
- **Revenue Forecast** — Linear regression on last 12 months → 3-month forward projection
- **Campaign ROI** — Revenue vs budget per campaign
- **Cohort Analysis** — Retention and LTV by creator acquisition cohort
- **ROAS by Creator** — Return on ad spend per creator

### Step 7: Payouts

When a payout period ends:
1. System calculates: `payout = attributed_revenue × commissionRate`
2. Finance team reviews pending payouts
3. Approve individually or bulk-approve
4. Mark as paid when settlement is complete

### Step 8: Audience Activation

Creator-acquired customers are segmented into audiences using rule-based filters:
- `creatorAcquired = true`
- `totalRevenue > 500`
- `orderCount >= 3`
- `channel = instagram`

Audiences can be:
- Computed on-demand (re-evaluated against all customers)
- Exported to Salesforce, Salesforce Data Cloud, SFMC, Shopify
- Downloaded as CSV

---

## 3. Architecture

### Monorepo Structure

```
Trackfluence/
├── apps/
│   ├── api/          NestJS 11 — REST + WebSocket API
│   └── web/          Next.js 15 — React frontend
├── packages/
│   ├── database/     Prisma 6 + PostgreSQL schema
│   └── shared/       Shared constants and TypeScript types
└── docker-compose.yml
```

### Technology Stack

| Layer | Technology |
|-------|-----------|
| API Framework | NestJS 11 (TypeScript) |
| Frontend | Next.js 15 (App Router, TypeScript) |
| Database | PostgreSQL 16 (via Prisma 6) |
| Cache / Queue | Redis 7 (cache-manager + BullMQ) |
| Auth | JWT (7-day expiry, bcrypt-12 for passwords) |
| Real-time | Socket.io (`/realtime` namespace) |
| Email | Resend |
| Payments | Stripe v22 (API version `2026-05-27.dahlia`) |
| Analytics | PostHog |
| Error Tracking | Sentry |
| CSS | Tailwind CSS v4 |
| Charts | Recharts 2 |
| Build System | Turborepo 2 + pnpm workspaces |
| Container | Docker (multi-stage, non-root user) |
| Deployment | Railway |

### Request Flow

```
Browser
  ↓ HTTPS
Next.js Middleware (edge JWT check)
  ↓
Next.js App Router (React Server Components + Client Components)
  ↓ fetch()
NestJS API (port 4000)
  ↓ Global Guards: JwtAuthGuard → RolesGuard → RateLimitGuard → UserRateLimitGuard
  ↓
Service Layer (business logic)
  ↓
Prisma ORM → PostgreSQL
        ↓
     Redis (cache + job queue)
```

### Global API Guards (Applied in Order)

1. **JwtAuthGuard** — Validates Bearer JWT. Routes marked `@Public()` skip this.
2. **RolesGuard** — Enforces `@Roles('ADMIN')` decorator
3. **RateLimitGuard** — IP-based global rate limit
4. **UserRateLimitGuard** — Per-user sliding window (200 req / 60 sec)

### Real-time Events (Socket.io)

```
Client connects to ws://api:4000/realtime
  → Must send JWT in handshake.auth.token
  → Server verifies JWT, joins room: user:<userId>
  → Server pushes:
      ATTRIBUTION_CREATED  — new revenue attributed
      PAYOUT_UPDATED       — payout status changed
      NOTIFICATION         — in-app notification
      CAMPAIGN_UPDATE      — campaign changed
```

---

## 4. Feature Reference

### 4.1 Creator Management

**Purpose:** Manage the roster of creators who promote your brand.

**Capabilities:**
- Create creators manually or bulk import via CSV
- Set individual commission rates (0–100%)
- View creator performance stats
- Invite creators to their personal portal via email token
- A/B test different tracking links per creator

**Creator Portal (Public):**
Each creator gets a token-gated URL they can access without a platform account:
```
/portal?token=<inviteToken>
```
Shows: their tracking links, click counts, attributed revenue, payout history, monthly chart.

**CSV Bulk Import:**
`POST /api/v1/creators/import` accepts a CSV string with columns:
`name`, `email`, `platform`, `handle`, `commissionRate`

Smart upsert: if email exists, updates — otherwise creates.

---

### 4.2 Campaign Management

**Purpose:** Organize creator efforts into time-bounded campaigns with budgets.

**Capabilities:**
- Create campaigns with start/end dates, budget, currency
- Assign multiple creators to a campaign
- Track campaign-level attribution and ROI
- Generate per-campaign tracking links
- A/B test link variants within a campaign

**A/B Variant Links:**
```
POST /api/v1/campaigns/:id/variants
{
  parentLinkId: "link_xxx",   // original link
  variantLabel: "Version B",  // label shown in UI
  destinationUrl: "..."       // optional different landing page
}
```
Both parent and variant links share an `abGroupId` in metadata. Variant stats show CVR (conversion rate) per variant.

---

### 4.3 Attribution Engine

**Purpose:** Connect clicks to revenue across the customer journey.

**Tracking Link Redirect:**
```
GET /api/v1/attribution/r/:shortCode
```
1. Records click + timestamp + session ID
2. Sets first-party cookie `__tf_session`
3. Redirects to `destinationUrl`

**Server-Side Event Ingestion (Meta CAPI compatible):**
```
POST /api/v1/attribution/server-events
{
  eventId, eventName, eventTime, actionSource,
  sourceUrl, userData: { email, phone, client_ip_address, ... }
}
```

**Attribution Window:**
- Click: 30 days
- View: 1 day

**Identity Resolution:**
When an order arrives, the system matches the customer across:
- Email hash
- Phone hash
- Session ID cookie
- Device ID
- Facebook Pixel FBP/FBC cookies

---

### 4.4 Revenue Intelligence Dashboard

**KPI Cards (Dashboard):**

| Metric | Formula |
|--------|---------|
| Total Revenue | Sum of all completed orders |
| Attributed Revenue | Sum of `attribution.attributedRevenue` |
| Attribution Rate | `attributedRevenue / totalRevenue × 100` |
| Avg Order Value | `totalRevenue / orderCount` |
| Creator-Acquired Customers | Count where `creatorAcquired = true` |
| Click-to-Attribution Rate | `attributionCount / totalClicks × 100` |

**Creator Scoring Algorithm:**
```
score = (revenue_share × 0.5 + conversion_share × 0.3 + click_share × 0.2) × 100

Tiers:
  ≥ 80 → Platinum 🏆
  55–79 → Gold 🥇
  30–54 → Silver 🥈
  < 30  → Bronze 🥉
```

**Revenue Forecast:**
Uses linear regression on 12 months of historical data:
```
y = mx + b
where x = month index, y = revenue
Projects 3 months forward (configurable via ?months=N)
```

**Multi-Currency:**
If orders exist in multiple currencies, a breakdown table shows:
`currency | totalRevenue | orderCount` per currency.

---

### 4.5 Audience Segmentation

**Purpose:** Build targetable customer segments from creator-attributed data.

**Rule Engine:**

| Field | Operators | Example |
|-------|-----------|---------|
| `creatorAcquired` | `eq` (true/false) | Creator-acquired customers only |
| `totalRevenue` | `gt`, `lt`, `gte`, `lte`, `eq` | High-value: revenue > $500 |
| `orderCount` | `gt`, `lt`, `gte`, `lte`, `eq` | Repeat buyers: orders >= 3 |
| `creatorId` | `eq`, `neq` | Customers from specific creator |
| `channel` | `eq`, `neq` | Instagram-only customers |

**Audience Workflow:**
1. Create audience with rules
2. `POST /:id/compute` — evaluates rules against all customers, populates `AudienceMember`
3. `POST /:id/export` — pushes to Salesforce, SFMC, Shopify, or Data Cloud
4. `GET /:id/csv` — download as CSV

---

### 4.6 Payout Management

**Purpose:** Calculate and manage creator commission payouts.

**Payout Lifecycle:**
```
PENDING → APPROVED (Admin reviews) → PAID (Finance marks settled) 
                                    ↓
                                CANCELLED (if not yet PAID)
```

**Auto-Calculation:**
```
GET /api/v1/payouts/calculate?creatorId=&periodStart=&periodEnd=
Returns: { totalAttributed, commissionRate, estimatedPayout, currency }
```

**Bulk Approve:**
```
POST /api/v1/payouts/bulk-approve
{ ids: ["payout_1", "payout_2", ...] }
```

**CSV Export:**
```
GET /api/v1/payouts/export/csv?status=APPROVED
```
Returns downloadable CSV with all payout details.

---

### 4.7 FTC Compliance

**Purpose:** Ensure creators properly disclose sponsored content per FTC guidelines.

**Disclosure Detection:**
The system scans content text for FTC-compliant disclosures:

| Detected Pattern | Type |
|-----------------|------|
| `#ad` | Hashtag |
| `#sponsored` | Hashtag |
| `#partner` | Hashtag |
| `#paidpartnership` | Hashtag |
| `paid partnership` | Phrase |
| `sponsored by` | Phrase |
| `in partnership with` | Phrase |
| `advertisement` | Phrase |

**Compliance Check Result:**
```
{
  isCompliant: boolean,
  hasDisclosure: boolean,
  disclosureType: "hashtag" | "text",
  issues: ["Missing FTC disclosure for sponsored content"]
}
```

**Auto-Remediation:**
If `isCompliant = false`, the system automatically sends a violation email to the creator with:
- Their name and content URL
- List of specific issues
- Link to FTC compliance guidelines

---

### 4.8 Billing & Subscriptions

**Plans:**

| Plan | Price | Creators | Links | Attribution Runs | Team Members | Webhooks |
|------|-------|----------|-------|-----------------|--------------|---------|
| **Free** | $0 | 3 | 10 | 50 | 1 | 0 |
| **Starter** | $49/mo | 15 | 100 | 1,000 | 3 | 5 |
| **Growth** | $149/mo | 100 | 1,000 | 20,000 | 10 | 20 |
| **Enterprise** | Custom | ∞ | ∞ | ∞ | ∞ | ∞ |

**Stripe Integration:**
- Checkout: Creates Stripe Checkout Session, redirects to Stripe-hosted payment page
- Portal: Opens Stripe Billing Portal for subscription management, invoice history, payment method changes
- Webhook: Handles `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

---

### 4.9 Organizations (Multi-Tenancy)

**Purpose:** Multiple team members share a workspace with role-based access.

**Roles:**

| Role | Read | Write | Delete | Invite | Billing | Admin |
|------|:----:|:-----:|:------:|:------:|:-------:|:-----:|
| Owner | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Admin | ✓ | ✓ | ✗ | ✓ | ✗ | ✓ |
| Member | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Viewer | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |

**Invite Flow:**
1. Admin sends invite: `POST /api/v1/organizations/:id/invite` with email + role
2. System sends invite email with token link
3. Recipient clicks link → `POST /api/v1/organizations/accept-invite/:token`
4. User added as organization member

**White-Label Domain Settings:**
Organizations can configure:
- Custom tracking domain (e.g. `links.yourbrand.com`)
- Slack webhook URL for event notifications
- Discord webhook URL for event notifications

---

### 4.10 Outbound Webhooks

**Purpose:** Push Trackfluence events to external systems in real-time.

**Creating a Webhook:**
```json
POST /api/v1/webhooks
{
  "url": "https://your-system.com/webhook",
  "events": ["payout.approved", "attribution.created"],
  "description": "My CRM integration"
}
```
Leave `events` empty to receive all 21 event types.

**Payload Format:**
```json
POST https://your-system.com/webhook
Headers:
  X-Trackfluence-Signature: sha256=<HMAC-SHA256>
  X-Trackfluence-Event: payout.approved
Body:
{
  "event": "payout.approved",
  "payload": { ...event-specific data },
  "timestamp": "2026-05-31T10:00:00Z"
}
```

**Signature Verification:**
```javascript
const hash = crypto.createHmac('sha256', YOUR_WEBHOOK_SECRET)
  .update(rawBody)
  .digest('hex');
const expectedSig = `sha256=${hash}`;
// Compare with X-Trackfluence-Signature header
```

**All Webhook Events:**

| Event | Triggered When |
|-------|---------------|
| `creator.created` | New creator added |
| `creator.updated` | Creator profile updated |
| `creator.invited` | Creator portal invite sent |
| `campaign.created` | New campaign created |
| `campaign.updated` | Campaign details changed |
| `attribution.created` | Revenue attributed to creator |
| `attribution.order_looked_up` | Order matched to attribution |
| `payout.created` | Payout record created |
| `payout.approved` | Payout approved by admin |
| `payout.paid` | Payout marked as paid |
| `payout.cancelled` | Payout cancelled |
| `billing.subscription_updated` | Plan changed |
| `billing.subscription_cancelled` | Subscription ended |
| `billing.payment_failed` | Stripe payment failed |
| `user.registered` | New user registered |
| `user.password_reset` | Password reset completed |
| `org.member_added` | Team member joined |
| `org.member_removed` | Team member removed |
| `compliance.check_completed` | FTC check run |
| `compliance.violation_detected` | Non-compliant content found |
| `report.generated` | Attribution report exported |

---

### 4.11 API Keys

**Purpose:** Programmatic access for integrations and data pipelines.

**Key Format:** `tf_<32 hex chars>` (total 35 characters)

**Capabilities:**
- Generate named API keys with scopes (`["read"]`, `["write"]`, `["read", "write"]`)
- Key shown **once** on creation (stored as SHA-256 hash)
- Revoke at any time
- Last-used timestamp tracked

---

### 4.12 Slack & Discord Notifications

When an organization configures webhook URLs in Settings → Domain Settings:

**Slack (Block Kit format):**
- New attribution created → revenue amount + creator name
- Payout approved → creator + amount
- Compliance violation → creator + issues

**Discord (Embed format):**
- Same events as Slack, formatted as Discord embeds with colors
- All notifications are fire-and-forget (never crash the main request)

---

### 4.13 Global Search

```
GET /api/v1/search?q=john&limit=5
```

Searches across:
- Creators (name, handle, email)
- Customers (email, firstName, lastName)
- Tracking Links (campaign name, shortCode, promoCode)

Returns: `{ creators: [...], customers: [...], trackingLinks: [...] }`

---

### 4.14 Reports & Exports

**Attribution Report CSV:**
```
GET /api/v1/reports/export-csv
```
Returns CSV with columns: `orderId, creatorId, model, attributedRevenue, attributionWeight, calculatedAt`

**Payout Report CSV:**
```
GET /api/v1/payouts/export/csv?status=APPROVED
```

**Audience CSV:**
```
GET /api/v1/audiences/:id/csv
```

---

### 4.15 Admin Panel

Accessible by platform-level `ADMIN` role users.

**Capabilities:**
- **User Management** — View all users, change roles, suspend (downgrades to VIEWER), delete (hard delete with audit)
  - Self-protection: Cannot suspend, delete, or change your own role
- **System Stats** — Live counts: users, creators, customers, orders, attributions
- **Cache Control** — Flush Redis cache (force-recompute all cached data)
- **Audit Logs** — Full trail of all admin actions with actor, action, entity, timestamp, IP

---

## 5. API Reference

### Base URL
```
Production: https://api.trackfluence.io/api/v1
Local:      http://localhost:4000/api/v1
```

### Authentication
```
Authorization: Bearer <JWT_TOKEN>
```

### Rate Limits
```
200 requests / 60 seconds per user
Headers returned: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
```

### Swagger / OpenAPI Docs
```
http://localhost:4000/api/docs
```

### Complete Endpoint List

#### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | Public | Register new user |
| POST | `/auth/login` | Public | Login, returns JWT |
| GET | `/auth/me` | JWT | Current user profile |
| POST | `/auth/forgot-password` | Public | Send reset email |
| POST | `/auth/reset-password` | Public | Reset with token |

#### Creators
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/creators` | JWT | List creators |
| POST | `/creators` | JWT | Create creator |
| POST | `/creators/import` | JWT | Bulk CSV import |
| GET | `/creators/:id` | JWT | Creator details |
| PATCH | `/creators/:id/commission` | JWT | Update commission rate |
| GET | `/creators/portal` | Token | Creator portal data |
| GET | `/creators/portal/timeseries` | Token | Monthly revenue chart |

#### Campaigns
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/campaigns` | Admin | Create campaign |
| GET | `/campaigns` | JWT | List campaigns |
| GET | `/campaigns/:id` | JWT | Campaign details |
| GET | `/campaigns/:id/stats` | JWT | Campaign ROI stats |
| PATCH | `/campaigns/:id` | Admin | Update campaign |
| DELETE | `/campaigns/:id` | Admin | Delete campaign |
| POST | `/campaigns/:id/variants` | Admin | Create A/B variant |
| GET | `/campaigns/:id/variants/:groupId` | JWT | A/B group stats |

#### Attribution
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/attribution/tracking-links` | JWT | Create tracking link |
| GET | `/attribution/tracking-links` | JWT | List tracking links |
| GET | `/attribution/tracking-links/:id` | JWT | Link details |
| GET | `/attribution/r/:shortCode` | Public | Redirect (records click) |
| POST | `/attribution/server-events` | Public | Server-side event ingest |

#### Revenue Intelligence
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/revenue-intelligence/dashboard` | JWT | KPI metrics |
| GET | `/revenue-intelligence/roas` | JWT | ROAS by creator |
| GET | `/revenue-intelligence/creators/performance` | JWT | Creator leaderboard |
| GET | `/revenue-intelligence/creators/scores` | JWT | Creator scores + tiers |
| GET | `/revenue-intelligence/timeseries` | JWT | Monthly revenue series |
| GET | `/revenue-intelligence/campaigns` | JWT | Campaign attribution |
| GET | `/revenue-intelligence/cohorts` | JWT | Cohort analysis |
| GET | `/revenue-intelligence/forecast` | JWT | Revenue forecast |
| GET | `/revenue-intelligence/currency-breakdown` | JWT | Revenue by currency |

#### Audiences
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/audiences` | Admin | Create segment |
| GET | `/audiences` | JWT | List segments |
| GET | `/audiences/:id` | JWT | Segment details |
| POST | `/audiences/:id/compute` | Admin | Re-evaluate membership |
| POST | `/audiences/:id/export` | Admin | Export to destination |
| DELETE | `/audiences/:id` | Admin | Delete segment |
| GET | `/audiences/:id/csv` | Admin | Download CSV |

#### Payouts
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/payouts` | Admin | Create payout |
| GET | `/payouts` | JWT | List payouts |
| GET | `/payouts/calculate` | JWT | Estimate payout |
| POST | `/payouts/:id/approve` | Admin | Approve payout |
| POST | `/payouts/bulk-approve` | Admin | Bulk approve |
| POST | `/payouts/:id/pay` | Admin | Mark as paid |
| POST | `/payouts/:id/cancel` | Admin | Cancel payout |
| GET | `/payouts/export/csv` | Admin | Export CSV |

#### Compliance
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/compliance/check` | JWT | Run FTC check |
| GET | `/compliance/summary` | JWT | Overall compliance |
| GET | `/compliance/creators` | JWT | All creator checks |
| GET | `/compliance/creators/:id` | JWT | Creator check history |

#### Billing
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/billing/plans` | Public | List plans + limits |
| GET | `/billing/subscription` | JWT | Current subscription |
| POST | `/billing/checkout` | JWT | Create Stripe checkout |
| POST | `/billing/portal` | JWT | Open billing portal |
| POST | `/billing/webhook` | Public (raw) | Stripe webhook |

#### Organizations
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/organizations` | JWT | Create organization |
| GET | `/organizations/mine` | JWT | Your organizations |
| GET | `/organizations/:id` | JWT | Org details + members |
| PATCH | `/organizations/:id` | Owner/Admin | Update org name |
| POST | `/organizations/:id/invite` | Owner/Admin | Invite member |
| POST | `/organizations/accept-invite/:token` | JWT | Accept invite |
| DELETE | `/organizations/:id/members/:userId` | Owner/Admin | Remove member |
| GET | `/organizations/:id/domain` | Member | Domain settings |
| PATCH | `/organizations/:id/domain` | Owner/Admin | Update domain/webhooks |

#### Webhooks
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/webhooks` | JWT | Create webhook |
| GET | `/webhooks` | JWT | List webhooks |
| POST | `/webhooks/:id/toggle` | JWT | Toggle active/disabled |
| DELETE | `/webhooks/:id` | JWT | Delete webhook |
| GET | `/webhooks/:id/deliveries` | JWT | Delivery history |
| POST | `/webhooks/deliveries/:id/retry` | JWT | Retry delivery |

#### API Keys
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api-keys` | JWT | Generate key |
| GET | `/api-keys` | JWT | List your keys |
| POST | `/api-keys/:id/revoke` | JWT | Revoke key |

#### Admin
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/users` | Admin | All platform users |
| POST | `/admin/users/:id/role` | Admin | Update role |
| GET | `/admin/stats` | Admin | System statistics |
| POST | `/admin/cache/flush` | Admin | Clear Redis cache |
| GET | `/admin/audit-logs` | Admin | Audit log |
| POST | `/admin/users/:id/suspend` | Admin | Suspend user |
| POST | `/admin/users/:id/promote` | Admin | Change role |
| DELETE | `/admin/users/:id` | Admin | Hard delete user |

#### Other
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/search?q=term` | JWT | Global search |
| GET | `/reports/export-csv` | JWT | Attribution CSV export |
| GET | `/api/health` | Public | Health check |
| GET | `/api/docs` | Public | Swagger UI |

---

## 6. Data Models

### Key Relationships

```
Organization
  └─ OrganizationMember (User ↔ Org with OrgRole)
  └─ Creator[]
  └─ Campaign[]
  └─ Webhook[]
  └─ Audience[]

User
  └─ Subscription (1:1)
  └─ ApiKey[]
  └─ Notification[]
  └─ AuditLog[]

Creator
  └─ TrackingLink[]
  └─ Payout[]
  └─ FTCComplianceCheck[]
  └─ CreatorInvite (1:1)

Customer
  └─ CustomerIdentity[] (multi-channel IDs)
  └─ ConsentRecord (1:1)
  └─ TouchPoint[]
  └─ Order[]
  └─ AudienceMember[]

Order
  └─ Attribution[] (one order → many model attributions)

TrackingLink
  └─ Event[]
  └─ TouchPoint[]
  └─ Attribution[]

Webhook
  └─ WebhookDelivery[]
```

### Enumerations

```typescript
UserRole:       ADMIN | MEMBER | VIEWER
OrgRole:        OWNER | ADMIN | MEMBER | VIEWER
PlanTier:       FREE | STARTER | GROWTH | ENTERPRISE
SubscriptionStatus: ACTIVE | TRIALING | PAST_DUE | CANCELED | UNPAID
PayoutStatus:   PENDING | APPROVED | PAID | CANCELLED
AttributionModel: FIRST_TOUCH | LAST_TOUCH | LINEAR | TIME_DECAY
EventCategory:  PAGE_VIEW | LINK_CLICK | ADD_TO_CART | INITIATE_CHECKOUT | PURCHASE | SIGN_UP | LEAD | CUSTOM
InteractionType: CLICK | VIEW | PROMO_CODE | REFERRAL
TrackingLinkType: STANDARD | PROMO_CODE | QR_CODE | REFERRAL
ContentType:    POST | STORY | VIDEO | BLOG
ConsentStatus:  GRANTED | DENIED | PENDING
OrderStatus:    PENDING | COMPLETED | REFUNDED | CANCELLED
WebhookStatus:  ACTIVE | DISABLED
ExportStatus:   PENDING | PROCESSING | COMPLETED | FAILED
IdentityType:   EMAIL | PHONE | CRM_ID | DEVICE_ID | SESSION_ID | SHOPIFY_ID | FBP | FBC
```

---

## 7. Billing Plans

| Feature | Free | Starter ($49/mo) | Growth ($149/mo) | Enterprise |
|---------|------|-----------------|-----------------|------------|
| Creators | 3 | 15 | 100 | Unlimited |
| Tracking Links | 10 | 100 | 1,000 | Unlimited |
| Attribution Runs | 50 | 1,000 | 20,000 | Unlimited |
| Team Members | 1 | 3 | 10 | Unlimited |
| Outbound Webhooks | 0 | 5 | 20 | Unlimited |
| Audience Exports | ✗ | ✓ | ✓ | ✓ |
| A/B Link Variants | ✗ | ✓ | ✓ | ✓ |
| Slack/Discord | ✗ | ✓ | ✓ | ✓ |
| Revenue Forecast | ✗ | ✗ | ✓ | ✓ |
| White-label Domain | ✗ | ✗ | ✓ | ✓ |
| SLA & Support | Community | Email | Priority | Dedicated |

---

## 8. Security & Auth

### JWT Authentication

```
Token format: JWT (HS256)
Payload: { sub: userId, email, role }
Expiry: 7 days
Storage: localStorage (tf_token) + HttpOnly-like cookie for middleware
```

### Password Security

```
Algorithm: bcrypt
Rounds: 12
Reset token: Random bytes → SHA-256 hash, 60-minute TTL, single-use
```

### API Key Security

```
Format: tf_<32 random hex>
Storage: SHA-256 hash only (plain key shown once, never stored)
Prefix: First 10 chars stored for display
```

### Rate Limiting

```
Default: 200 requests / 60 seconds per authenticated user
Fallback: IP-based when no user (unauthenticated)
Cache: Redis sliding window
Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
```

### Webhook Security

```
Method: HMAC-SHA256
Header: X-Trackfluence-Signature: sha256=<hash>
Key: Per-webhook secret (stored in DB)
```

### Stripe Webhook Security

```
Method: Stripe's constructEvent() with raw body
Secret: STRIPE_WEBHOOK_SECRET env var
Failure: Logs warning + rethrows (returns 400 to Stripe for retry)
```

### CORS

```
Allowed Origins: CORS_ORIGIN env var (default: http://localhost:3000)
Credentials: true
```

### Edge Middleware Auth

```
Next.js middleware.ts runs at edge before every page
Reads: tf_token cookie (set on login)
Redirect: Unauthenticated → /login?from=<original_path>
Public paths: /login, /register, /forgot-password, /reset-password, /portal, /offline
```

### Input Validation

All API inputs validated with `class-validator` + `ValidationPipe`:
```
whitelist: true        — strip unknown properties
forbidNonWhitelisted: true — throw 400 on unknown properties
transform: true        — auto-type-coerce inputs
```

---

## 9. Integrations

### Shopify

**Inbound (Orders → Trackfluence):**
- Shopify sends webhooks to `POST /api/v1/connectors/shopify/webhook`
- HMAC-SHA256 verified using `SHOPIFY_API_SECRET`
- Events: `orders/create`, `orders/paid`
- Customer identity matched via email

**Data Synced:** Order amount, currency, customer email, line items

---

### Salesforce

**OAuth 2.0 Flow:**
1. `GET /api/v1/connectors/salesforce/oauth/start` → Redirects to Salesforce login
2. Salesforce redirects to `GET /api/v1/connectors/salesforce/oauth/callback`
3. Token stored in `OAuthToken` table (encrypted)

**Sync Directions:**
- Audiences → Salesforce Leads/Contacts
- Creator-acquired customers → Salesforce Data Cloud
- SFMC email list exports

---

### Meta (Facebook) CAPI

**Server-Side Events:**
```
POST /api/v1/attribution/server-events
```
Accepts Meta CAPI-compatible payload including `fbp`, `fbc` identity markers for cross-device attribution.

---

### Resend (Email)

**Transactional Emails:**
- Welcome email on registration
- Password reset link
- Creator portal invite
- FTC compliance violation notice
- Payout approved notification

---

### PostHog (Product Analytics)

**Events Tracked:**
- User registrations
- Campaign created
- Attribution created
- Payout approved
- Feature usage patterns

---

### Sentry (Error Monitoring)

- API: NestJS Sentry global filter — all unhandled exceptions
- Web: `instrumentation.ts` for server + edge, `instrumentation-client.ts` for browser
- React render errors: `global-error.tsx`
- Source maps: Uploaded in CI when `SENTRY_AUTH_TOKEN` is set

---

## 10. Environment Variables

### API (`apps/api`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | — | Min 16 chars, signs all JWTs |
| `NODE_ENV` | — | `development` | `production` \| `development` \| `test` |
| `API_PORT` | — | `4000` | Port the API listens on |
| `CORS_ORIGIN` | — | `http://localhost:3000` | Allowed frontend origin |
| `REDIS_HOST` | — | `localhost` | Redis hostname |
| `REDIS_PORT` | — | `6379` | Redis port |
| `REDIS_PASSWORD` | — | — | Redis auth password |
| `RESEND_API_KEY` | — | — | Resend.com API key for emails |
| `EMAIL_FROM` | — | — | From address for transactional email |
| `APP_URL` | — | — | Frontend URL (used in email links) |
| `APP_BASE_URL` | — | — | Same as APP_URL |
| `SHOPIFY_API_SECRET` | — | — | Shopify HMAC webhook verification |
| `SALESFORCE_CLIENT_ID` | — | — | Salesforce Connected App client ID |
| `SALESFORCE_CLIENT_SECRET` | — | — | Salesforce client secret |
| `SALESFORCE_REDIRECT_URI` | — | — | OAuth callback URL |
| `SALESFORCE_LOGIN_URL` | — | `https://login.salesforce.com` | Salesforce login endpoint |
| `STRIPE_SECRET_KEY` | — | — | Stripe secret key (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | — | — | Stripe webhook signing secret |
| `STRIPE_PRICE_STARTER` | — | — | Stripe Price ID for Starter plan |
| `STRIPE_PRICE_GROWTH` | — | — | Stripe Price ID for Growth plan |
| `STRIPE_PRICE_ENTERPRISE` | — | — | Stripe Price ID for Enterprise plan |
| `POSTHOG_API_KEY` | — | — | PostHog project API key |
| `POSTHOG_HOST` | — | `https://app.posthog.com` | PostHog instance URL |

### Web (`apps/web`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ | NestJS API base URL (e.g. `https://api.trackfluence.io`) |
| `NEXT_PUBLIC_SENTRY_DSN` | — | Sentry DSN for frontend error tracking |
| `SENTRY_ORG` | — | Sentry org slug (for source map upload in CI) |
| `SENTRY_PROJECT` | — | Sentry project slug |
| `SENTRY_AUTH_TOKEN` | — | Sentry API token (CI only, not committed) |

---

## 11. Deployment

### Railway (Recommended)

Both `apps/api` and `apps/web` have pre-configured `railway.toml` files.

**Required Railway Services:**
1. **PostgreSQL** plugin — provides `DATABASE_URL`
2. **Redis** plugin — provides `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`

**Deploy Steps:**
1. Push repository to GitHub
2. Connect repo in Railway dashboard
3. Railway auto-detects `railway.toml` in each app directory
4. Set all environment variables in Railway service settings
5. Deploy — Railway builds via Dockerfile, runs `start.sh` on boot

**API Boot Sequence (`start.sh`):**
```
1. Check if prisma/migrations/ folder exists
2. If yes: run `prisma migrate deploy`  (production migrations)
3. If no:  run `prisma db push`         (first-deploy schema sync)
4. Start: `node dist/main`
```

**Health Check:**
```
GET /api/health
Returns: { status: "ok", info: { database: { status: "up" } } }
```

### Docker Compose (Local Full Stack)

```bash
docker-compose up
```

Starts:
- `api` — NestJS on port 4000
- `web` — Next.js on port 3000
- `postgres` — PostgreSQL on port 5432
- `redis` — Redis on port 6379

### Production Docker Details

**API Dockerfile (multi-stage):**
1. `deps` — install all dependencies
2. `builder` — generate Prisma client, compile TypeScript
3. `runner` — lean Alpine image, non-root `nestjs` user, port 4000

**Web Dockerfile (multi-stage):**
1. `deps` — install all dependencies
2. `builder` — `next build` (standalone output)
3. `runner` — Alpine image, non-root `nextjs` user, port 3000

---

## 12. Developer Setup

### Prerequisites
- Node.js 22+
- pnpm 9+
- Docker Desktop (for local PostgreSQL + Redis)

### Initial Setup

```powershell
# 1. Install dependencies
pnpm install

# 2. Start local infrastructure
docker-compose up -d postgres redis

# 3. Create .env files
cp .env.example apps/api/.env
# Fill in DATABASE_URL, JWT_SECRET at minimum

# 4. Generate Prisma client
pnpm db:generate

# 5. Push schema to database (first-time)
pnpm --filter @trackfluence/database exec prisma db push

# 6. Seed database (optional)
pnpm --filter @trackfluence/database exec prisma db seed

# 7. Start development servers
pnpm dev
# API: http://localhost:4000
# Web: http://localhost:3000
# Swagger: http://localhost:4000/api/docs
# Bull Board: http://localhost:4000/api/admin/queues
```

### Common Commands

```powershell
# Type check all packages
npx tsc --noEmit -p apps/api/tsconfig.json
npx tsc --noEmit -p apps/web/tsconfig.json
npx tsc --noEmit -p packages/shared/tsconfig.json

# Run all unit tests
pnpm --filter @trackfluence/api test

# Run tests in watch mode
pnpm --filter @trackfluence/api test:watch

# Build for production
pnpm --filter @trackfluence/web build

# Generate Prisma client after schema changes
pnpm db:generate

# Create a migration
pnpm --filter @trackfluence/database exec prisma migrate dev --name <migration-name>

# Open Prisma Studio
pnpm --filter @trackfluence/database exec prisma studio

# Run smoke tests (requires running Docker stack)
./scripts/smoke-test.ps1
```

### Project Layout

```
apps/api/src/
├── admin/          User management, system stats, cache control
├── analytics/      PostHog event tracking
├── api-keys/       API key generation + validation
├── attribution/    Tracking links, event ingest, redirect
├── audience/       Segmentation rules + activation
├── audit/          Audit log service
├── auth/           JWT auth, register, login, password reset
├── billing/        Stripe subscriptions, plans
├── cache/          Redis cache service + warming
├── campaigns/      Campaign CRUD + A/B variants
├── common/         Guards, decorators, interceptors
├── compliance/     FTC content compliance checks
├── config/         Env validation schema
├── connectors/     Shopify webhooks, Salesforce OAuth
├── creators/       Creator profiles, portal, CSV import
├── email/          Transactional email via Resend
├── events/         Browser event ingest
├── health/         Health check endpoint
├── identity/       Customer identity resolution
├── notifications/  In-app + Slack/Discord notifications
├── organizations/  Multi-tenancy, invites, domain settings
├── payouts/        Commission calculation + workflow
├── prisma/         PrismaService singleton
├── queue/          BullMQ job queues
├── realtime/       Socket.io gateway
├── reports/        CSV export + scheduled reports
├── revenue-attribution/  Revenue attribution runs
├── revenue-intelligence/ KPIs, scores, forecasting
├── search/         Global cross-entity search
└── webhooks/       Outbound webhook delivery

apps/web/src/
├── app/            Next.js App Router pages
│   ├── dashboard/      Main KPI dashboard
│   ├── campaigns/      Campaign management + UTM builder
│   ├── creators/       Creator roster + onboarding wizard
│   ├── revenue/        Revenue attribution analytics
│   ├── intelligence/   AI-powered insights + forecasting
│   ├── audiences/      Audience segmentation
│   ├── payouts/        Payout management
│   ├── compliance/     FTC compliance checks
│   ├── connectors/     Integration management
│   ├── settings/       Org settings + domain config
│   ├── webhooks/       Webhook management
│   ├── admin/          Admin panel (users, audit, stats)
│   └── portal/         Creator self-service portal
├── components/     Shared UI components
│   ├── layout/         Sidebar, header, notifications
│   ├── campaigns/      UTM builder, A/B modal
│   ├── creators/       Onboarding wizard, compare drawer
│   └── ui/             Toast, modals, charts
└── lib/            Utilities + contexts
    ├── auth-context.tsx    JWT auth state
    ├── date-range-context.tsx  Date filter state
    └── toast-context.tsx   Toast notification system
```

---

*Documentation generated from Trackfluence source code — May 2026*
