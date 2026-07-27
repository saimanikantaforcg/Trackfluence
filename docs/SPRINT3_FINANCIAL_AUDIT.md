# Sprint 3 — Financial Precision Audit

## Scope

Audit all money fields in the Prisma schema and all service-layer revenue calculations for floating-point precision risks.

---

## 1. Schema Money Fields

| Model         | Field               | Type             | Precision            | Notes                                             |
| ------------- | ------------------- | ---------------- | -------------------- | ------------------------------------------------- |
| `Creator`     | `commissionRate`    | `Decimal(5, 4)`  | 5 digits, 4 decimal  | e.g. 0.1000 = 10%. Good.                          |
| `Customer`    | `totalRevenue`      | `Decimal(12, 2)` | 12 digits, 2 decimal | OK for dollar amounts                             |
| `Customer`    | `ltv`               | `Decimal(12, 2)` | 12 digits, 2 decimal | OK                                                |
| `Order`       | `totalAmount`       | `Decimal(12, 2)` | 12 digits, 2 decimal | OK                                                |
| `Attribution` | `attributedRevenue` | `Decimal(12, 2)` | 12 digits, 2 decimal | OK                                                |
| `Attribution` | `attributionWeight` | `Float`          | 32-bit float         | ⚠️ Weight is fine, but multiplied against revenue |
| `Campaign`    | `budget`            | `Decimal(12, 2)` | 12 digits, 2 decimal | OK                                                |
| `Payout`      | `amount`            | `Decimal(12, 2)` | 12 digits, 2 decimal | OK                                                |

**Verdict**: Schema uses `Decimal(12, 2)` consistently for all money fields. No `Decimal` fields use `Float`. This is **acceptable** for dollar-and-cent precision.

---

## 2. Service-Layer Precision Risks

### 🔴 P1 — Revenue Attribution: Float × Decimal Multiplication

**File**: `apps/api/src/revenue-attribution/revenue-attribution.service.ts`

```typescript
// L68
const totalRevenue = Number(order.totalAmount); // Decimal → Number (precision loss)

// L89-95 (LINEAR model)
const weight = 1.0 / touchpoints.length; // Float division
revenue: totalRevenue * weight; // Number × Float → Number (stored back as Decimal)

// L100-113 (TIME_DECAY model)
const rawWeights = touchpoints.map((_, i) => Math.pow(2, i / halfLife)); // Float exponent
const total = rawWeights.reduce((s, w) => s + w, 0);
revenue: totalRevenue * w; // Number × Float
```

**Impact**: For orders with many touchpoints (e.g., 10+), the LINEAR model divides revenue into fractions that cannot be represented exactly in binary floating point. The sum of all attributed revenues may not equal the original order total due to rounding.

**Example**: $100.00 order, 3 touchpoints LINEAR → each gets $33.333333... → stored as $33.33 → total attributed = $99.99 ≠ \$100.00.

### 🔴 P1 — Commission Calculation: Float × Decimal

**File**: `apps/api/src/payouts/payouts.service.ts`

```typescript
// L162-164
const totalRevenue = attributions.reduce(
  (sum, a) => sum + Number(a.attributedRevenue ?? 0),
  0,
);
const rate = Number(creator.commissionRate ?? 0);
const commission = totalRevenue * rate;
```

**Impact**: `commissionRate` is `Decimal(5, 4)` but converted to `Number` via `Number()`. For large revenue values, the multiplication loses precision. A 10.5% commission on \$1,234,567.89 would have rounding errors.

### 🟡 P2 — Shopify Data Ingestion: parseFloat

**File**: `apps/api/src/connectors/shopify/shopify.service.ts`

```typescript
// L75, L82, L119, L121
totalRevenue: { increment: parseFloat(order.total_price) },
totalAmount: parseFloat(order.total_price),
```

**Impact**: `parseFloat` on a string like `"1234.56"` is safe for small values, but for very large values or high-precision decimals, floating-point parsing introduces errors. Shopify sends prices as strings, so `parseFloat` is a lossy conversion.

### 🟡 P2 — Revenue Intelligence: All Aggregations Use Number()

**File**: `apps/api/src/revenue-intelligence/revenue-intelligence.service.ts`

```typescript
// L66-68
const totalRevenue = Number(orders._sum.totalAmount ?? 0);
const attributedRevenue = Number(attributions._sum.attributedRevenue ?? 0);

// L73
attributionRate: totalRevenue > 0 ? attributedRevenue / totalRevenue : 0,
```

**Impact**: Prisma returns `Decimal` as a string from the database. `Number()` conversion is safe for values within JavaScript's safe integer range (±9 quadrillion). For typical revenue values (< \$1B), this is acceptable. However, the division for `attributionRate` is a floating-point operation.

### 🟡 P2 — Cache Warming: Same Number() Pattern

**File**: `apps/api/src/cache/cache-warming.service.ts`

```typescript
// L49-50
const totalRevenue = Number(orders._sum.totalAmount ?? 0);
const attributedRevenue = Number(attributions._sum.attributedRevenue ?? 0);
```

Same pattern as Revenue Intelligence — acceptable for typical values.

### 🟢 P3 — Campaign Budget/Spend

**File**: `apps/api/src/campaigns/campaigns.service.ts`

```typescript
// L103-104
const spend = Number(payouts._sum.amount ?? 0);
const budget = Number(campaign.budget ?? 0);
```

**Impact**: Low risk. Budget/spend values are typically whole dollars or simple decimals.

### 🟢 P3 — Creator Scores

**File**: `apps/api/src/revenue-intelligence/revenue-intelligence.service.ts`

```typescript
// L325
attributedRevenue: c.attributions.reduce((s, a) => s + Number(a.attributedRevenue), 0),
```

**Impact**: Scores are normalized 0-100 and used for ranking, not financial reporting. Precision loss here is acceptable.

---

## 3. Recommended Fixes

### Fix 1: Round Attribution Results to Nearest Cent

**File**: `apps/api/src/revenue-attribution/revenue-attribution.service.ts`

After computing attribution revenue for each touchpoint, round to 2 decimal places. For the last touchpoint in a multi-touch model, use a "balancing item" approach to ensure the sum equals the original total.

```typescript
// After computing attributions array, apply rounding:
const rounded = attributions.map((a, i) => ({
  ...a,
  revenue:
    i === attributions.length - 1
      ? Math.round(
          (totalRevenue -
            attributions.slice(0, -1).reduce((s, x) => s + x.revenue, 0)) *
            100,
        ) / 100
      : Math.round(a.revenue * 100) / 100,
}));
```

### Fix 2: Use Decimal.js for Commission Calculations

**File**: `apps/api/src/payouts/payouts.service.ts`

Replace `Number()` arithmetic with `Decimal.js` for commission calculations:

```typescript
import Decimal from "decimal.js";

const totalRevenue = attributions.reduce(
  (sum, a) => sum + new Decimal(a.attributedRevenue ?? 0).toNumber(),
  0,
);
// Or better: keep as Decimal throughout
const total = attributions.reduce(
  (sum, a) => sum.plus(a.attributedRevenue ?? 0),
  new Decimal(0),
);
const rate = new Decimal(creator.commissionRate ?? 0);
const commission = total
  .times(rate)
  .toDecimalPlaces(2)
  .toNumber();
```

### Fix 3: Use Decimal.js in Revenue Attribution Service

Replace `Number(order.totalAmount)` with `new Decimal(order.totalAmount.toString())` and perform all arithmetic using Decimal operations, rounding to 2 decimal places at the end.

### Fix 4: Shopify parseFloat → Decimal

**File**: `apps/api/src/connectors/shopify/shopify.service.ts`

Replace `parseFloat(order.total_price)` with `new Decimal(order.total_price).toNumber()` or pass the string directly to Prisma which handles Decimal from string.

---

## 4. Summary

| Issue                                              | Severity | File                              | Line(s)          |
| -------------------------------------------------- | -------- | --------------------------------- | ---------------- |
| Float × Decimal in attribution (LINEAR/TIME_DECAY) | 🔴 P1    | `revenue-attribution.service.ts`  | 89-95, 100-113   |
| Commission calc uses Number()                      | 🔴 P1    | `payouts.service.ts`              | 162-164          |
| Shopify parseFloat                                 | 🟡 P2    | `shopify.service.ts`              | 75, 82, 119, 121 |
| Revenue Intelligence Number() aggregations         | 🟡 P2    | `revenue-intelligence.service.ts` | 66-68, 73        |
| Cache warming Number()                             | 🟡 P2    | `cache-warming.service.ts`        | 49-50            |
| Campaign budget/spend Number()                     | 🟢 P3    | `campaigns.service.ts`            | 103-104          |
| Creator scores Number()                            | 🟢 P3    | `revenue-intelligence.service.ts` | 325              |

**Overall Verdict**: The schema is well-designed with `Decimal(12, 2)` for all money fields. The primary risk is in the **service layer** where `Number()` conversion and floating-point arithmetic can cause penny-level rounding errors in multi-touch attribution and commission calculations. These are P1 issues for financial correctness but not security issues.
