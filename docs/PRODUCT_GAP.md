# Trackfluence — Product Gap Analysis

> **Version:** 1.0 | **Date:** May 2026 | **Scope:** v1.0 vs. market expectations

This document identifies capability gaps between the current Trackfluence v1.0 implementation and what mature competitors offer, enterprise buyers expect, and what the product roadmap should address.

---

## 1. Executive Summary

Trackfluence v1.0 is a complete, production-ready attribution and intelligence platform. Relative to enterprise-grade competitors (Impact.com, PartnerStack), the following gap tiers exist:

| Priority | Gap | Effort | Impact |
|----------|-----|--------|--------|
| P0 (critical) | Direct payout disbursement | High | Revenue quality |
| P0 (critical) | Database migrations (no `migrations/` folder) | Low | Deployment safety |
| P1 (high) | Real-time attribution (sub-5-min) | Medium | Data freshness |
| P1 (high) | Native mobile app or PWA | High | Creator adoption |
| P1 (high) | AI-powered recommendations | High | Differentiation |
| P1 (high) | Content performance tracking (views/likes) | Medium | Creator scoring depth |
| P2 (medium) | TikTok / YouTube native API | High | Platform coverage |
| P2 (medium) | SOC 2 Type II compliance | High | Enterprise unblocking |
| P2 (medium) | Multi-org switching | Medium | Enterprise UX |
| P2 (medium) | White-label full rebrand | Medium | Agency revenue |
| P3 (low) | Blockchain attribution proof | Very High | Niche differentiator |
| P3 (low) | Automated FX conversion | Medium | Multi-currency payouts |

---

## 2. P0 — Critical Gaps (Block Revenue / Deployment)

### 2.1 No Direct Payout Disbursement

**Current state:** Trackfluence calculates commissions and marks payouts as PAID manually. There is no actual money movement.

**Gap:** Competitors like Impact.com and PartnerStack send money to creators via ACH, PayPal, or direct bank transfer — all from within the platform.

**Impact:** Without actual disbursement, brands must copy-paste amounts into Stripe, PayPal, or their bank — breaking the "automated payouts" promise.

**Recommended fix:**
- Integrate **Stripe Connect** — each creator is a Connected Account
- Payouts marked PAID trigger `stripe.transfers.create()` automatically
- Creator onboards via Stripe Connect Express (bank verification, identity)
- Estimated effort: 3–4 weeks

---

### 2.2 No Prisma Migrations Folder

**Current state:** `start.sh` falls back to `prisma db push` for first deploy. There is no `prisma/migrations/` directory.

**Gap:** `db push` is not safe for production. It can silently drop columns. Production databases need deterministic, reviewable migration files.

**Impact:** Any schema change in production risks data loss without `migrate deploy`.

**Recommended fix:**
```bash
pnpm --filter @trackfluence/database exec prisma migrate dev --name init
# Commit the generated migrations/ folder to git
```
- Estimated effort: 30 minutes

---

## 3. P1 — High Priority Gaps (Block Scale)

### 3.1 Attribution Latency — No Real-Time Processing

**Current state:** Attribution runs synchronously when an order event arrives. There is no streaming pipeline.

**Gap:** For high-volume brands (1,000+ orders/day), attribution runs need to be queued and processed asynchronously with real-time dashboard updates.

**What's there:** BullMQ is already integrated. Attribution job queue infrastructure exists.

**Gap to close:**
- Move attribution calculation to BullMQ job (already scaffolded)
- Push dashboard update via Socket.io when job completes
- Add job retry logic for transient DB failures
- Estimated effort: 1 week

---

### 3.2 No Mobile App or Progressive Web App

**Current state:** Web app is responsive but not installable as a PWA. No native app.

**Gap:** Creators primarily live on mobile. The creator portal, in particular, needs to work well as an app.

**What's there:** `manifest.json` and `sw.js` exist in `/public/` — PWA groundwork is in place.

**Gap to close:**
- Enable service worker registration in `instrumentation-client.ts`
- Add `Add to Home Screen` prompt
- Ensure creator portal pages are offline-capable via cache-first strategy
- Estimated effort: 1–2 weeks

---

### 3.3 No AI / ML Recommendations

**Current state:** Creator scoring is rule-based (fixed formula). Forecasting uses linear regression.

**Gap:** Competitors are beginning to add AI layers: "Which creator should I activate for this product?" or "This creator's audience is likely to buy [product category]."

**Recommended additions:**
- **Creator-product affinity scoring** — based on historical conversion patterns by product category
- **Churn prediction** — identify creators at risk of going inactive
- **Budget allocation optimizer** — recommend creator budget splits to maximize ROAS
- **Anomaly detection** — alert when a creator's CVR drops significantly
- Estimated effort: 4–8 weeks (requires ML pipeline or OpenAI API integration)

---

### 3.4 Content Performance Tracking Gap

**Current state:** Trackfluence tracks revenue-side (clicks → orders). It does not pull content metrics (views, likes, shares, reach) from social platforms.

**Gap:** A creator's score is calculated only from attribution data. A creator with 1M views but low conversion would score the same as a low-reach creator — missing awareness value.

**Recommended additions:**
- Instagram Basic Display API / Creator API for content metrics
- TikTok Research API for view data
- YouTube Data API for video stats
- New score component: `awareness_score × 10%` (views, reach)
- Estimated effort: 3–5 weeks per platform

---

### 3.5 No Email Drip / Campaign Sequences

**Current state:** Trackfluence sends transactional emails (welcome, reset, invite, compliance violations). No drip sequences.

**Gap:** After a creator joins, brands need automated onboarding sequences: "Welcome → Your first link → FTC reminder → Monthly performance recap."

**Recommended additions:**
- Integrate **Loops.so** or **Resend Broadcast** for sequences
- Creator onboarding sequence (3 emails over 7 days)
- Monthly performance digest (automated via BullMQ `@Cron`)
- Estimated effort: 1–2 weeks

---

## 4. P2 — Medium Priority Gaps (Block Enterprise)

### 4.1 No SOC 2 Type II

**Current state:** No formal compliance certification.

**Gap:** Enterprise brands ($50M+) require SOC 2 Type II for vendor approval. Without it, Trackfluence cannot close enterprise deals.

**What's needed:**
- Engage a compliance firm (Vanta, Drata, or Secureframe)
- 6-month audit observation window
- Required controls: access logging (done), encryption at rest, MFA, incident response plan
- Estimated timeline: 6–12 months

---

### 4.2 No Multi-Factor Authentication (MFA)

**Current state:** Password + JWT only.

**Gap:** SOC 2 and enterprise security policies require MFA for admin accounts.

**Recommended fix:**
- TOTP via `speakeasy` or `otplib`
- Optional enforcement per organization (Owner can require MFA for all members)
- Estimated effort: 1–2 weeks

---

### 4.3 No Multi-Org Switching

**Current state:** A user can belong to multiple organizations but there is no UI to switch between them without re-logging.

**Gap:** Agency users manage multiple brand clients. They need to switch orgs in one click.

**Recommended fix:**
- Add org-switcher to the sidebar
- JWT scoping per org (or include all orgs in JWT with active selection in header)
- Estimated effort: 1 week

---

### 4.4 No White-Label Full Rebrand

**Current state:** Custom domain for tracking links (configured per org). The platform UI always shows "Trackfluence" branding.

**Gap:** Agencies want to resell the platform under their own brand ("PowerTrack by [Agency]").

**Recommended additions:**
- Custom logo upload per organization
- Custom primary color theme (CSS variable override)
- Remove Trackfluence branding in sidebar + emails when white-label is enabled
- Estimated effort: 2–3 weeks

---

### 4.5 Salesforce Sync is One-Way

**Current state:** Audiences can be exported to Salesforce. There is no Salesforce → Trackfluence sync.

**Gap:** Brands track customer stages in Salesforce. Trackfluence should be able to pull CRM-enriched data (deal stage, lifetime value, industry) to improve attribution models.

**Recommended additions:**
- Pull Salesforce Contact/Account enrichment into `Customer.metadata`
- Bidirectional sync (Salesforce opportunity closed → Trackfluence order)
- Estimated effort: 2–3 weeks

---

### 4.6 No Attribution for Email / SMS Channels

**Current state:** Attribution covers creator-link clicks and server-side events. Email and SMS campaigns (Klaviyo, Attentive) are not tracked.

**Gap:** Brands run email + creator simultaneously. Without email attribution, creator ROI is overestimated when email assisted the conversion.

**Recommended additions:**
- Klaviyo webhook for email open/click events → Event ingestion
- Attentive SMS click webhook
- Channel weighting in attribution models
- Estimated effort: 2–3 weeks

---

## 5. P3 — Lower Priority / Future Vision

### 5.1 Automated FX Conversion

**Current state:** Multi-currency revenue tracked separately. Payout amounts are in the order currency — no FX conversion applied.

**Gap:** A UK creator referred a US-dollar order. The payout is in USD but the creator wants GBP.

**Recommended fix:**
- Integrate **Open Exchange Rates** or **Stripe FX** for live rates
- Add `displayAmount` + `displayCurrency` to `Payout` model
- Estimated effort: 1 week

---

### 5.2 TikTok Shop Native Integration

**Current state:** TikTok creators can use tracking links but there is no native TikTok Shop integration.

**Gap:** TikTok Shop is the fastest-growing creator commerce channel. Without native attribution, TikTok-driven revenue is significantly underreported.

**Recommended fix:**
- TikTok Shop webhook for order events
- TikTok creator profile fetching (handle → platform stats)
- Estimated effort: 3–4 weeks

---

### 5.3 Blockchain Attribution Proof

**Current state:** Attribution records exist only in PostgreSQL.

**Gap:** Some enterprise brands and creators want an immutable, auditable record of attribution decisions — especially when large commissions are at stake.

**Potential approach:**
- Hash attribution records and post to a public blockchain (Polygon, Base)
- Creator and brand can independently verify their attribution data
- Estimated effort: Very high — research phase only

---

## 6. Competitive Feature Matrix (Post-Gap Fixes)

| Feature | v1.0 | After P0 fixes | After P1 fixes | Impact.com |
|---------|:----:|:--------------:|:--------------:|:----------:|
| Multi-touch attribution | ✅ | ✅ | ✅ | ✅ |
| Creator scoring | ✅ | ✅ | ✅ improved | ✅ |
| Direct payout disbursement | ❌ | ✅ | ✅ | ✅ |
| Real-time attribution | Partial | Partial | ✅ | ✅ |
| AI recommendations | ❌ | ❌ | ✅ | Partial |
| Mobile app | Partial | Partial | ✅ PWA | ✅ |
| SOC 2 Type II | ❌ | ❌ | ❌ | ✅ |
| MFA | ❌ | ❌ | ✅ | ✅ |
| TikTok Shop | ❌ | ❌ | ❌ | ✅ |
| White-label | Partial | Partial | ✅ | ✅ |
| SMB pricing (< $50/mo) | ✅ | ✅ | ✅ | ❌ |

---

## 7. Recommended Roadmap

### Q3 2026 (Months 1–3) — Foundation
1. ✅ Create Prisma migrations folder (immediate)
2. Stripe Connect for creator payout disbursement
3. BullMQ-based async attribution with Socket.io push
4. PWA + offline support (service worker)
5. Prisma migrations for production safety

### Q4 2026 (Months 4–6) — Growth
1. MFA (TOTP) for all accounts
2. Multi-org switcher
3. Email drip sequences (creator onboarding + monthly digest)
4. Klaviyo email channel attribution
5. TikTok Shop webhook

### Q1 2027 (Months 7–9) — Enterprise
1. SOC 2 audit begins
2. White-label full rebrand
3. AI creator recommendations (OpenAI integration)
4. Salesforce bidirectional sync
5. Content performance tracking (Instagram + TikTok APIs)

### Q2 2027 (Months 10–12) — Scale
1. SOC 2 Type II certification
2. Automated FX conversion
3. YouTube Data API integration
4. Multi-currency payout display
5. Blockchain attribution proof (experimental)

---

*Gap analysis generated May 2026 — Trackfluence v1.0*
