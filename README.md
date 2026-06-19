<div align="center">

<img src="apps/web/public/icons/icon-192x192.png" alt="Trackfluence logo" width="96" height="96" />

# Trackfluence

**Revenue Attribution & Intelligence Platform for Creator-Led Growth**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Stripe](https://img.shields.io/badge/Stripe-v22-635BFF?logo=stripe&logoColor=white)](https://stripe.com/)
[![Tests](https://img.shields.io/badge/Tests-31%20passing-22c55e?logo=jest)](https://jestjs.io/)
[![License](https://img.shields.io/badge/License-UNLICENSED-gray)](./LICENSE)

[Live Demo](#) · [Swagger Docs](http://localhost:4000/api/docs) · [Full Documentation](./DOCUMENTATION.md)

</div>

---

## What is Trackfluence?

Trackfluence is a **B2B SaaS platform** that answers one question most brands can't:

> _Which creator actually drove that sale — and what's that customer worth long-term?_

It connects creator activity (tracked links, promo codes, content) to revenue events (purchases, subscriptions) through a **multi-touch attribution engine**, giving brands the data they need to pay creators fairly, forecast revenue, and activate audiences.

```
Creator posts link → Customer clicks → Customer buys
         ↑                                    ↓
  Trackfluence connects these two events and calculates:
  - Which creator gets credit (and how much)
  - Commission owed
  - Customer LTV attributed to that creator
```

---

## Features at a Glance

| Feature                        | Description                                                          |
| ------------------------------ | -------------------------------------------------------------------- |
| 🔗 **Tracking Links**          | 8-char short codes with UTM params, QR codes, promo codes            |
| 📊 **Multi-Touch Attribution** | First Touch, Last Touch, Linear, Time Decay models                   |
| 🧠 **Revenue Intelligence**    | Creator scores, ROAS, cohort analysis, revenue forecasting           |
| 👥 **Creator Management**      | Profiles, commission rates, portal, bulk CSV import                  |
| 💸 **Payout Automation**       | Commission calculation, approval workflow, bulk approve              |
| 🎯 **Audience Segmentation**   | Rule-based segments → Salesforce / SFMC / Shopify export             |
| ✅ **FTC Compliance**          | Auto-detect missing disclosures, email violations to creators        |
| 🔔 **Real-time Notifications** | Socket.io push + Slack/Discord webhooks                              |
| 🏢 **Multi-tenancy**           | Organizations with OWNER / ADMIN / MEMBER / VIEWER roles             |
| 💳 **Billing**                 | Stripe subscriptions (Free / Starter $49 / Growth $149 / Enterprise) |
| 🔌 **Integrations**            | Shopify, Salesforce, Meta CAPI, Resend, PostHog, Sentry              |
| 🔑 **API Keys**                | Scoped keys for programmatic access                                  |
| 📤 **Outbound Webhooks**       | 21 event types, HMAC-signed delivery                                 |
| 📧 **Creator Onboarding**      | Automated email drip sequences (Day 1, 3, 14) via BullMQ             |
| 🏗️ **Async Processing**        | BullMQ job queues for attribution + onboarding + Shopify webhooks    |
| 📱 **PWA Install**             | Creator portal installable as mobile app (Add to Home Screen)        |

---

## Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend   Next.js 15 (App Router) · Tailwind v4 · Recharts│
├─────────────────────────────────────────────────────────────┤
│  API        NestJS 11 · TypeScript · Swagger/OpenAPI         │
├─────────────────────────────────────────────────────────────┤
│  Database   PostgreSQL 16 · Prisma 6                         │
├─────────────────────────────────────────────────────────────┤
│  Cache/Queue Redis 7 · cache-manager · BullMQ                │
├─────────────────────────────────────────────────────────────┤
│  Email      Resend (transactional + drip sequences)          │
├─────────────────────────────────────────────────────────────┤
│  Auth       JWT (7-day) · bcrypt-12 · Edge middleware        │
├─────────────────────────────────────────────────────────────┤
│  Real-time  Socket.io (/realtime namespace)                  │
├─────────────────────────────────────────────────────────────┤
│  Build      Turborepo 2 · pnpm workspaces                    │
├─────────────────────────────────────────────────────────────┤
│  Deploy     Railway · Docker (multi-stage, non-root)         │
└─────────────────────────────────────────────────────────────┘
```

---

## Repository Structure

```
trackfluence/
├── apps/
│   ├── api/                    # NestJS REST + WebSocket API (port 4000)
│   │   └── src/
│   │       ├── admin/          # User management, system stats, audit
│   │       ├── attribution/    # Tracking links, click recording, event ingest
│   │       ├── auth/           # JWT auth, register, login, password reset
│   │       ├── billing/        # Stripe subscriptions & webhooks
│   │       ├── campaigns/      # Campaign CRUD + A/B variant links
│   │       ├── compliance/     # FTC disclosure detection + auto-email
│   │       ├── connectors/     # Shopify webhooks, Salesforce OAuth
│   │       ├── creators/       # Creator profiles, portal, CSV import
│   │       ├── organizations/  # Multi-tenancy, invites, domain settings
│   │       ├── payouts/        # Commission calculation & payout workflow
│   │       ├── queue/          # BullMQ processors (attribution, onboarding, shopify)
│   │       ├── realtime/       # Socket.io gateway
│   │       ├── revenue-intelligence/ # KPIs, scores, forecasting
│   │       └── webhooks/       # Outbound webhook delivery (21 events)
│   │
│   └── web/                    # Next.js 15 frontend (port 3000)
│       └── src/app/
│           ├── dashboard/      # KPI dashboard
│           ├── campaigns/      # UTM builder, A/B modal
│           ├── creators/       # Onboarding wizard, compare drawer
│           ├── intelligence/   # Forecast charts, creator scores
│           ├── revenue/        # Attribution analytics
│           ├── audiences/      # Segment builder + activation
│           ├── payouts/        # Payout management table
│           ├── compliance/     # FTC check UI
│           ├── admin/          # User management, audit logs
│           └── portal/         # Public creator self-service portal
│
├── packages/
│   ├── database/               # Prisma schema + seed (PostgreSQL)
│   └── shared/                 # Shared TS types & constants
│
├── scripts/
│   └── smoke-test.ps1          # Post-deploy smoke test
│
├── docker-compose.yml          # Local dev stack
├── docker-compose.prod.yml     # Production stack
├── DOCUMENTATION.md            # Full product documentation
└── README.md                   # This file
```

---

## Quick Start

### Prerequisites

| Tool           | Version |
| -------------- | ------- |
| Node.js        | ≥ 22    |
| pnpm           | ≥ 9     |
| Docker Desktop | Latest  |

### 1. Clone & Install

```bash
git clone https://github.com/your-org/trackfluence.git
cd trackfluence
pnpm install
```

### 2. Start Infrastructure

```bash
# Start PostgreSQL + Redis locally
docker-compose up -d postgres redis
```

### 3. Configure Environment

```bash
# Copy the example env file
cp .env.example .env
```

Open `.env` and set the two required values:

```env
DATABASE_URL=postgresql://trackfluence:trackfluence@localhost:5432/trackfluence
JWT_SECRET=your-super-secret-key-min-16-chars
```

All other variables are optional for local development (Stripe, Resend, Sentry, etc.).

### 4. Set Up Database

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations (first time only — creates all tables)
pnpm --filter @trackfluence/database exec prisma migrate deploy

# Optional: seed with sample data
pnpm --filter @trackfluence/database exec prisma db seed

# Optional: seed demo data via API (requires running API)
# POST /api/v1/admin/seed-demo (ADMIN only)
```

### 5. Start Development Servers

```bash
pnpm dev
```

| Service             | URL                                                       |
| ------------------- | --------------------------------------------------------- |
| Frontend            | http://localhost:3000                                     |
| API                 | http://localhost:4000                                     |
| Swagger Docs        | http://localhost:4000/api/docs                            |
| Bull Board (queues) | http://localhost:4000/api/admin/queues                    |
| Prisma Studio       | `pnpm --filter @trackfluence/database exec prisma studio` |

---

## How It Works

```
1. Brand adds Creator → sets commission rate (e.g. 10%)
          ↓
2. Create Campaign → assign creators, set budget
          ↓
3. Generate Tracking Link → short URL with UTM + session cookie
          ↓
4. Creator shares link with their audience
          ↓
5. Customer clicks → Trackfluence records touchpoint
          ↓
6. Customer purchases → Shopify/Meta CAPI sends order to Trackfluence
          ↓
7. Identity Resolution → match customer to touchpoint via email/session
          ↓
8. Attribution Engine → apply model (Last Touch / Linear / etc.)
          ↓
9. Revenue assigned to creator → commission calculated automatically
          ↓
10. Finance reviews → approves payout → marks as paid
```

### Attribution Models

| Model           | How credit is split                              |
| --------------- | ------------------------------------------------ |
| **First Touch** | 100% to the first creator in the journey         |
| **Last Touch**  | 100% to the last creator before purchase         |
| **Linear**      | Equal split across all creators with touchpoints |
| **Time Decay**  | Higher weight to more recent touchpoints         |

### Creator Scoring

---

## Resuming development

If you cloned the repo or downloaded the ZIP, follow the step-by-step guide: [SETUP.md](./SETUP.md). It includes prerequisites, env variables, Docker commands, Prisma init/push, and how to start the dev servers.

Every creator gets a **0–100 score** updated in real-time:

```
score = revenue_share×50% + conversion_share×30% + click_share×20%

≥ 80 → Platinum 🏆
55–79 → Gold 🥇
30–54 → Silver 🥈
< 30  → Bronze 🥉
```

---

## API Reference

Base URL: `http://localhost:4000/api/v1`

Authentication: `Authorization: Bearer <JWT>`

Rate limit: **200 req / 60 sec** per user

Interactive docs at `/api/docs` (Swagger UI).

### Core Endpoints

```
POST   /auth/register                    Register
POST   /auth/login                       Login → JWT
GET    /auth/me                          Current user

GET    /creators                         List creators
POST   /creators                         Create creator
POST   /creators/import                  Bulk CSV import
POST   /creators/:id/invite              Send portal invite (triggers onboarding emails)

POST   /campaigns                        Create campaign
GET    /campaigns/:id/stats              ROI stats
POST   /campaigns/:id/variants           A/B variant link

POST   /attribution/tracking-links       Create tracking link
GET    /attribution/r/:shortCode         Click redirect (public)
POST   /attribution/server-events        Server-side event ingest
POST   /revenue-attribution/calculate/:orderId/async  Queue attribution (BullMQ)

GET    /revenue-intelligence/dashboard   KPIs
GET    /revenue-intelligence/creators/scores  Creator leaderboard
GET    /revenue-intelligence/forecast    Revenue forecast

POST   /payouts/bulk-approve             Bulk approve payouts
GET    /payouts/export/csv               Download payout CSV

POST   /compliance/check                 Run FTC check
POST   /audiences/:id/export             Push to Salesforce/Shopify

POST   /admin/seed-demo                  Seed demo data (ADMIN only)
```

Full endpoint list in [DOCUMENTATION.md → Section 5](./DOCUMENTATION.md#5-api-reference).

---

## Billing Plans

|                    | Free | Starter | Growth   | Enterprise |
| ------------------ | ---- | ------- | -------- | ---------- |
| **Price**          | \$0  | \$49/mo | \$149/mo | Custom     |
| Creators           | 3    | 15      | 100      | ∞          |
| Tracking Links     | 10   | 100     | 1,000    | ∞          |
| Attribution Runs   | 50   | 1,000   | 20,000   | ∞          |
| Team Members       | 1    | 3       | 10       | ∞          |
| Webhooks           | 0    | 5       | 20       | ∞          |
| Revenue Forecast   | ✗    | ✗       | ✓        | ✓          |
| White-label Domain | ✗    | ✗       | ✓        | ✓          |

---

## Running Tests

```bash
# Unit tests (31 tests, 5 suites)
pnpm --filter @trackfluence/api test

# TypeScript check (all packages)
npx tsc --noEmit -p apps/api/tsconfig.json
npx tsc --noEmit -p apps/web/tsconfig.json
npx tsc --noEmit -p packages/shared/tsconfig.json

# E2E tests (Playwright — requires running app)
pnpm --filter @trackfluence/web e2e

# Smoke test (post-deploy — requires Docker stack)
./scripts/smoke-test.ps1
```

**Current test status:**

- ✅ 31/31 unit tests passing
- ✅ 0 TypeScript errors (API + Web + Shared)
- ✅ 26/26 Next.js pages build successfully

---

## Deployment

### Railway (Recommended)

Both apps have pre-configured `railway.toml` files for one-click Railway deployment.

```
1. Push to GitHub
2. Create project on Railway
3. Add services: PostgreSQL + Redis plugins
4. Set environment variables (see .env.example)
5. Deploy — Railway auto-detects Dockerfiles
```

**Required env vars for Railway:**

```env
# API service
DATABASE_URL=<from Railway PostgreSQL plugin>
JWT_SECRET=<generate: openssl rand -hex 32>
REDIS_HOST=<from Railway Redis plugin>
REDIS_PORT=6379
CORS_ORIGIN=https://your-web-domain.up.railway.app

# Web service
NEXT_PUBLIC_API_URL=https://your-api-domain.up.railway.app
```

### Docker Compose (Self-hosted)

```bash
# Copy and fill production env
cp .env.example .env.production

# Start full stack
docker-compose -f docker-compose.prod.yml up -d

# Health check
curl http://localhost:4000/api/health
```

### First-Deploy Database

On first boot with no migration history, `start.sh` automatically runs `prisma migrate deploy` to apply all committed migrations. The initial migration (`0_init`) creates all 28 tables, 15 enums, indexes, and foreign key constraints.

---

## Security

| Concern            | Implementation                                      |
| ------------------ | --------------------------------------------------- |
| Authentication     | JWT HS256, 7-day expiry                             |
| Passwords          | bcrypt rounds=12                                    |
| API Keys           | SHA-256 hash only, shown once                       |
| Rate Limiting      | 200 req/60s per user (Redis sliding window)         |
| Input Validation   | class-validator, whitelist + forbidNonWhitelisted   |
| Webhook Signatures | HMAC-SHA256 per webhook                             |
| Stripe Webhooks    | `constructEvent()` raw body verification            |
| Edge Auth          | Next.js middleware cookie check on all routes       |
| CORS               | Explicit origin allowlist via `CORS_ORIGIN`         |
| Container          | Non-root users (`nestjs`, `nextjs`) in Docker       |
| Audit Logging      | Every admin action logged with actor, IP, timestamp |

---

## Integrations

| Integration    | Purpose                                        | Setup                                             |
| -------------- | ---------------------------------------------- | ------------------------------------------------- |
| **Shopify**    | Order ingestion via webhooks                   | Set `SHOPIFY_API_SECRET`                          |
| **Salesforce** | Audience activation + Data Cloud               | OAuth via `/connectors/salesforce/oauth/start`    |
| **Meta CAPI**  | Server-side purchase events                    | Post to `/attribution/server-events`              |
| **Stripe**     | Subscriptions + billing portal                 | Set `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` |
| **Resend**     | Transactional email + creator onboarding drips | Set `RESEND_API_KEY`                              |
| **PostHog**    | Product analytics                              | Set `POSTHOG_API_KEY`                             |
| **Sentry**     | Error monitoring                               | Set `NEXT_PUBLIC_SENTRY_DSN`                      |
| **Slack**      | Event notifications                            | Set webhook URL in Org Settings                   |
| **Discord**    | Event notifications                            | Set webhook URL in Org Settings                   |

---

## Development Commands

```bash
# Install all dependencies
pnpm install

# Start all apps in dev mode
pnpm dev

# Build all apps
pnpm build

# Run API tests
pnpm --filter @trackfluence/api test

# Regenerate Prisma client (after schema changes)
pnpm db:generate

# Create a new database migration
pnpm --filter @trackfluence/database exec prisma migrate dev --name <name>

# Open Prisma Studio (DB GUI)
pnpm --filter @trackfluence/database exec prisma studio

# Lint API
pnpm --filter @trackfluence/api lint

# Lint Web
pnpm --filter @trackfluence/web lint

# Type-check everything
npx tsc --noEmit -p apps/api/tsconfig.json
npx tsc --noEmit -p apps/web/tsconfig.json
npx tsc --noEmit -p packages/shared/tsconfig.json
```

---

## Environment Variables

See [`.env.example`](./.env.example) for the full list with descriptions.

**Minimum required to run locally:**

```env
DATABASE_URL=postgresql://trackfluence:trackfluence@localhost:5432/trackfluence
JWT_SECRET=at-least-16-characters-long
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make changes — run `pnpm test` and TypeScript checks before committing
4. Open a pull request

**Commit convention:** `feat:`, `fix:`, `chore:`, `docs:`, `test:`

---

## License

UNLICENSED — All rights reserved.

---

<div align="center">

Built with NestJS · Next.js · Prisma · PostgreSQL · Redis · Stripe

</div>
