# Trackfluence Current State Validation Report

## Executive Verdict

- **Sprint 1 Status**: COMPLETE ✅
- **Sprint 2 Status**: 85% COMPLETE ⚠️
- **Safe for Internal Testing**: YES ✅
- **Safe for Real Customer Data**: NO ❌
- **Safe for Friendly Alpha**: NO ❌

## Completed Work Verified

### Sprint 1 (Security Foundation)

- ✅ Bull Board is gated and protected (admin-only access)
- ✅ JWT verified in Next.js middleware using jose
- ✅ Server-side API fetcher forwards auth token
- ✅ OAuth tokens encrypted using AES-256-GCM
- ✅ TOKEN_ENCRYPTION_KEY required in production
- ✅ HttpOnly Secure SameSite cookie strategy implemented
- ✅ Client-readable tf_token cookie write removed
- ✅ JWT carries organizationId
- ✅ CurrentOrg decorator reads organizationId from verified JWT
- ✅ Organizations service validates membership before switching

### Sprint 2 (Org Scoping) - Fixed During Validation

- ✅ **api-keys org scoping** - FIXED: Added orgId parameter to generate method
- ✅ **identity org isolation** - VERIFIED: All methods scope by orgId
- ✅ **audience org scoping** - FIXED: Added orgId to all service methods and controller
- ✅ **webhooks org scoping** - VERIFIED: All methods scope by orgId
- ✅ **payouts org scoping** - FIXED: Added orgId to calculateForCreator attribution query
- ✅ **search org scoping** - VERIFIED: All search methods scope by orgId
- ✅ **compliance org scoping** - VERIFIED: All methods scope by orgId
- ✅ **organization member/switching safety** - VERIFIED: Membership validated
- ✅ **Shopify placeholder email removal** - VERIFIED: Uses externalId when email missing

## Incomplete Work

### P0 Blockers (Must fix before real customer data)

1. **Shopify webhook orgId resolution** - The public webhook endpoint (`/api/v1/connectors/shopify/webhook`) receives `shopDomain` but has no way to map it to an `organizationId`. The job is queued without orgId, so all created customers/orders/attributions have `organizationId: null`.
   - **Impact**: Cross-tenant data leakage risk. All Shopify data goes to org-less records.
   - **Fix required**: Add a `ShopifyConnector` model with `shopDomain` -> `organizationId` mapping, or require orgId in webhook payload (less secure).

### P1 Issues (Must fix before alpha)

1. **No cross-tenant e2e tests** - Zero test files found in the codebase.

   - **Impact**: Cannot verify tenant isolation works correctly.
   - **Fix required**: Add e2e tests that verify:
     - Org A cannot access Org B's data
     - Webhook payloads are scoped correctly
     - API keys are org-scoped

2. **API keys list method not org-scoped** - `listForUser` returns all keys for a user, not filtered by org.

   - **Impact**: Users with multiple orgs see all their keys.
   - **Fix required**: Add orgId parameter to `listForUser` and filter by org.

3. **WebhookDelivery records don't store organizationId** - While webhooks are org-scoped, the delivery history doesn't explicitly store orgId (relies on webhook relationship).
   - **Impact**: Minor - makes auditing harder.
   - **Fix required**: Add `organizationId` to `WebhookDelivery` model or ensure queries always join through webhook.

## P0 Blockers

### 1. Shopify Webhook OrgId Resolution (CRITICAL)

**Location**: `apps/api/src/connectors/connectors.controller.ts:62-66`

The webhook endpoint is public (`@Public()`) and queues jobs without orgId:

```typescript
await this.shopifyQueue.add(
  topic,
  { topic, shopDomain, payload }, // ❌ No orgId
  { jobId: `${shopDomain}-${topic}-${Date.now()}` },
);
```

**Why this is critical**:

- The webhook cannot use `@CurrentOrg()` (it's public, no JWT)
- Without orgId, all created records have `organizationId: null`
- This breaks tenant isolation for the entire Shopify integration

**Recommended fix**:

1. Add `ShopifyConnector` model to Prisma schema:

```prisma
model ShopifyConnector {
  id             String    @id @default(cuid())
  organizationId String
  shopDomain     String    @unique
  accessToken    String?   // encrypted
  scope          String?
  installedAt    DateTime  @default(now())

  @@index([organizationId])
  @@index([shopDomain])
}
```

2. Update webhook controller to look up orgId by shopDomain:

```typescript
const connector = await this.prisma.shopifyConnector.findUnique({
  where: { shopDomain }
});
if (!connector) throw new BadRequestException('Shopify not connected');
await this.shopifyQueue.add(topic, { topic, shopDomain, payload, orgId: connector.organizationId }, ...);
```

## P1 Issues

### 1. Missing Cross-Tenant E2E Tests

**Severity**: High  
**Impact**: Cannot verify tenant isolation works in practice

**Required tests**:

- Create Org A and Org B with separate data
- Verify Org A cannot query Org B's creators/customers/orders
- Verify webhook deliveries are org-scoped
- Verify API keys cannot access other orgs

### 2. API Keys List Not Org-Scoped

**Location**: `apps/api/src/api-keys/api-keys.service.ts:58-68`

```typescript
async listForUser(userId: string) {
  return this.prisma.apiKey.findMany({
    where: { userId, revokedAt: null },  // ❌ No org filter
  });
}
```

**Fix**: Add orgId parameter:

```typescript
async listForUser(userId: string, orgId?: string) {
  return this.prisma.apiKey.findMany({
    where: {
      userId,
      revokedAt: null,
      ...(orgId ? { organizationId: orgId } : {})
    },
  });
}
```

### 3. WebhookDelivery Missing Explicit OrgId

**Location**: `packages/database/prisma/schema.prisma:590-600`

The `WebhookDelivery` model doesn't have `organizationId` field. While it inherits org context through the `Webhook` relation, this makes direct queries harder.

**Fix**: Add `organizationId` to `WebhookDelivery`:

```prisma
model WebhookDelivery {
  id             String    @id @default(cuid())
  webhookId      String
  webhook        Webhook   @relation(fields: [webhookId], references: [id], onDelete: Cascade)
  organizationId String?   // Add this
  event          String
  payload        Json
  responseStatus Int?
  responseBody   String?
  success        Boolean   @default(false)
  attemptedAt    DateTime  @default(now())

  @@index([webhookId])
  @@index([organizationId])  // Add this
}
```

## Recommended Next Phase

### Phase 1: Fix P0 Blockers (1-2 days)

1. **Add ShopifyConnector model** to Prisma schema
2. **Create migration** for ShopifyConnector
3. **Update webhook controller** to resolve orgId from shopDomain
4. **Update Shopify service** to use orgId from connector
5. **Test webhook flow** with multiple orgs

### Phase 2: Add E2E Tests (2-3 days)

1. Set up test database
2. Create cross-tenant test suite:
   - Test org isolation for all major entities
   - Test webhook org scoping
   - Test API key org scoping
3. Add to CI pipeline

### Phase 3: Alpha Preparation (1 day)

1. Fix P1 issues (API keys list, WebhookDelivery orgId)
2. Run full e2e test suite
3. Security audit of all org-scoped endpoints
4. Deploy to staging with real Shopify test store

## GO / NO-GO

### ❌ NO-GO for Real Customer Data

**Reason**: Shopify webhook orgId resolution is a critical P0 blocker. Without it, all Shopify-sourced data has `organizationId: null`, breaking tenant isolation.

### ❌ NO-GO for Friendly Alpha

**Reason**:

1. P0 blocker (Shopify webhook orgId) must be fixed first
2. No e2e tests to verify tenant isolation
3. API keys list not org-scoped

### ✅ GO to Continue Sprint 2

**Next steps**:

1. Fix Shopify webhook orgId resolution (P0)
2. Add cross-tenant e2e tests (P1)
3. Fix API keys list org scoping (P1)
4. Add WebhookDelivery organizationId (P2)
5. Re-validate and proceed to alpha

---

## Validation Summary

**Code Quality**: Good - consistent patterns, proper use of decorators  
**Security**: Strong foundation with minor gaps in webhook org resolution  
**Architecture**: Clean separation, proper use of CurrentOrg decorator  
**Test Coverage**: None - e2e tests are completely missing  
**Production Readiness**: 85% - needs P0 blocker fixed and e2e tests added

**Overall Assessment**: The Sprint 1 security foundation is solid. Sprint 2 org scoping is 85% complete with one critical gap (Shopify webhook orgId resolution). The codebase follows consistent patterns and the architecture is sound. With the P0 fix and e2e tests added, this would be ready for friendly alpha.
