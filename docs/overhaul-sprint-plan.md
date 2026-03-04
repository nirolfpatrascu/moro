# Moro Production Overhaul — Sprint Plan

**Audit Score:** 5.1/10 | **Created:** 2026-03-04 | **Sprints:** 5 (Sprint 0–4)

The app has critical data integrity bugs (Float for money, invoices showing as paid when unpaid, dashboard calculations using wrong date fields) and zero production hardening (no API auth on routes, no tests, no CI/CD, no monitoring). This plan organizes fixes into 5 deployable sprints, prioritized by production impact.

**Dependency order:** Sprint 0 → 1 → 2 → 3 → 4 (each sprint assumes previous sprints are complete)

---

## Sprint 0: Emergency Data Integrity Fixes

**Goal:** Fix every bug that causes wrong numbers in the database or dashboard.
**Estimated Duration:** ~8 hours
**Definition of Done:** All financial calculations are correct. Import pipeline produces accurate data. Dashboard queries use correct date fields.

### Phase 0.1 — VAT Constant Extraction

**Problem:** VAT rate `1.19` is hardcoded in 7 places across 4 files. A rate change requires 7 manual edits.

**Create `src/lib/constants.ts`:**
```ts
/** Romanian standard VAT rate (19%) */
export const VAT_RATE = 0.19;
/** Multiplier: total = exVat * VAT_MULTIPLIER */
export const VAT_MULTIPLIER = 1 + VAT_RATE;
```

**Replace hardcoded references in these exact locations:**

| File | Line | Current Code | New Code |
|------|------|-------------|----------|
| `src/components/incoming/invoice-form.tsx` | 161 | `+(total / 1.19).toFixed(2)` | `+(total / VAT_MULTIPLIER).toFixed(2)` |
| `src/components/incoming/invoice-form.tsx` | 175 | `+(total / 1.19).toFixed(2)` | `+(total / VAT_MULTIPLIER).toFixed(2)` |
| `src/components/outgoing/invoice-form.tsx` | 119 | `+(total / 1.19).toFixed(2)` | `+(total / VAT_MULTIPLIER).toFixed(2)` |
| `src/app/api/incoming-invoices/route.ts` | 104 | `+(totalAmount / 1.19).toFixed(2)` | `+(totalAmount / VAT_MULTIPLIER).toFixed(2)` |
| `src/app/api/incoming-invoices/[id]/route.ts` | 101 | `+(data.totalAmount / 1.19).toFixed(2)` | `+(data.totalAmount / VAT_MULTIPLIER).toFixed(2)` |
| `src/app/api/outgoing-invoices/route.ts` | 102 | `+(totalAmount / 1.19).toFixed(2)` | `+(totalAmount / VAT_MULTIPLIER).toFixed(2)` |
| `src/app/api/outgoing-invoices/[id]/route.ts` | 93 | `+(data.totalAmount / 1.19).toFixed(2)` | `+(data.totalAmount / VAT_MULTIPLIER).toFixed(2)` |

Also replace the inline `0.19` in `src/app/api/import/commit/route.ts` line 196:
```ts
// Before:
const vatRate = 0.19;
amountExVat = +(totalAmount / (1 + vatRate)).toFixed(2);

// After:
import { VAT_MULTIPLIER } from "@/lib/constants";
amountExVat = +(totalAmount / VAT_MULTIPLIER).toFixed(2);
```

**Verification:**
```bash
grep -rn "1\.19\|1\.19" src/ --include="*.ts" --include="*.tsx"  # Should return 0 matches
grep -rn "VAT_RATE\|VAT_MULTIPLIER" src/  # Should show all replacements
```

---

### Phase 0.2 — Float to Decimal Migration

**Problem:** All 73 monetary `Float` fields use IEEE 754 floating-point. This causes rounding errors in financial calculations (e.g., `0.1 + 0.2 !== 0.3`).

**Step 1: Update `prisma/schema.prisma`**

Change every monetary `Float` field to `Decimal` across these models:

| Model | Fields to change | Count |
|-------|-----------------|-------|
| `DailyIncome` | totalSales, tva, salesExVat, avgReceipt, barSales, kitchenSales, cashAmount, cardAmount, transferAmount, accountAmount, deliveryAmount, tipsFiscal, tipsTotal | 13 |
| `Receipt` | amount | 1 |
| `IncomingInvoice` | qty, unitPrice, amountExVat, vatAmount, totalAmount, paidAmount, remainingAmount | 7 |
| `OutgoingInvoice` | amountExVat, totalAmount, paidAmount, unpaidAmount | 4 |
| `MonthlyPnL` | All Float fields (totalIncome through netProfit) | 29 |
| `MonthlyCashFlow` | All Float fields (openingBalance through closingBalance) | 26 |
| `MonthlyCOGS` | All Float fields | 15 |
| `Employee` | grossSalary, netSalary, salaryTaxes, mealTickets, annualCost | 5 |
| `Dividend` | raiffeisenAmount, garantiAmount, totalWithTaxes, dividendAmount, balance | 5 |
| `MonthlyForecast` | magnoliaValue, orizontValue, totalValue | 3 |

**Total: ~108 Float → Decimal changes** (includes non-monetary counts like `receiptCount` that should stay as `Int`, so audit each field)

Pattern for each field:
```prisma
// Before:
totalSales      Float    @default(0)
// After:
totalSales      Decimal  @default(0)
```

**Step 2: Run migration**
```bash
npx prisma migrate dev --name float-to-decimal
```

**Step 3: Add `serializeDecimal()` helper to `src/lib/prisma.ts`**

Prisma returns `Decimal` as `Prisma.Decimal` objects, not plain numbers. JSON.stringify will produce `"totalSales": {"s":1,"e":2,"d":[123,45]}` instead of `123.45`. Every API route returning financial data needs conversion.

```ts
import { PrismaClient, Prisma } from '@prisma/client'

// ... existing singleton code ...

/**
 * Convert Prisma Decimal fields to plain numbers for JSON serialization.
 * Call this before returning data in API routes.
 */
export function serializeDecimal<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (data instanceof Prisma.Decimal) return Number(data) as unknown as T;
  if (Array.isArray(data)) return data.map(serializeDecimal) as unknown as T;
  if (typeof data === 'object' && data !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = serializeDecimal(value);
    }
    return result as T;
  }
  return data;
}
```

**Step 4: Update all API routes that return financial data**

Add `serializeDecimal()` wrap to every `NextResponse.json()` call in these files:

- `src/app/api/daily-income/route.ts` — GET (list), POST (create)
- `src/app/api/daily-income/[id]/route.ts` — GET, PUT
- `src/app/api/incoming-invoices/route.ts` — GET, POST
- `src/app/api/incoming-invoices/[id]/route.ts` — GET, PUT, PATCH
- `src/app/api/outgoing-invoices/route.ts` — GET, POST
- `src/app/api/outgoing-invoices/[id]/route.ts` — GET, PUT, PATCH
- `src/app/api/dashboard/route.ts` — all query functions
- `src/app/api/receipts/route.ts` — GET, POST
- `src/app/api/receipts/[id]/route.ts` — GET, PUT
- `src/app/api/search/route.ts` — GET

Pattern:
```ts
// Before:
return NextResponse.json(records);
// After:
return NextResponse.json(serializeDecimal(records));
```

**Verification:**
```bash
npx prisma migrate status  # Should show migration applied
# Test: POST an invoice with totalAmount=100.50, GET it back, verify exact value
```

---

### Phase 0.3 — Fix `parseNumeric` European Format

**Problem:** `src/lib/excel.ts` line 144 — `.replace(",", ".")` only replaces the **first** comma. European format like `1.000,50` (one thousand and fifty cents) becomes `1.000.50` which `parseFloat` reads as `1` (stops at second dot).

**Current code (line 140-149):**
```ts
export function parseNumeric(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.,-]/g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}
```

**Fixed code:**
```ts
export function parseNumeric(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    let cleaned = value.replace(/[^\d.,-]/g, "");
    // Handle European format: 1.000,50 → 1000.50
    // If there's a comma, treat dots as thousand separators
    if (cleaned.includes(",")) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    }
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}
```

**Test cases to verify:**
| Input | Expected | Before (broken) |
|-------|----------|-----------------|
| `"1.000,50"` | `1000.50` | `1` |
| `"1,50"` | `1.50` | `1.50` (was OK) |
| `"1000.50"` | `1000.50` | `1000.50` (was OK) |
| `"1.234.567,89"` | `1234567.89` | `1.234` |
| `""` | `0` | `0` (was OK) |

---

### Phase 0.4 — Invoice Validation Fixes

**Problem 1:** `totalAmount` allows `0` — invoices with `totalAmount=0` are imported and pollute reports.

**Fix in `src/lib/validations/incoming-invoice.ts` line 13:**
```ts
// Before:
totalAmount: z.coerce.number().min(0).default(0),
// After:
totalAmount: z.coerce.number().positive("Suma totala trebuie sa fie > 0"),
```

**Fix in `src/lib/validations/outgoing-invoice.ts` line 10:**
```ts
// Before:
totalAmount: z.coerce.number().min(0).default(0),
// After:
totalAmount: z.coerce.number().positive("Suma totala trebuie sa fie > 0"),
```

**Problem 2:** `paidAmount` can exceed `totalAmount` — no bounds check.

**Fix in `src/app/api/incoming-invoices/[id]/route.ts` PUT handler:**
Add after parsing the body:
```ts
if (data.paidAmount !== undefined && data.totalAmount !== undefined) {
  if (data.paidAmount > data.totalAmount) {
    return NextResponse.json(
      { error: "Suma achitata nu poate depasi suma totala" },
      { status: 400 }
    );
  }
}
```

Apply the same pattern to:
- `src/app/api/outgoing-invoices/[id]/route.ts` PUT handler

**Problem 3:** Import trusts Excel `remainingAmount` instead of recalculating.

**Fix in `src/app/api/import/commit/route.ts` lines 201-202:**
```ts
// Before:
const paidAmount = Number(row.paidAmount) || 0;
const remainingAmount = Number(row.remainingAmount) || 0;

// After:
const paidAmount = Number(row.paidAmount) || 0;
const remainingAmount = Math.max(0, totalAmount - paidAmount); // Always recalculate
```

**Problem 4:** Status derivation happens before `remainingAmount` is set, and doesn't account for `remainingAmount=0` with `totalAmount=0`.

The current status logic at lines 204-209 is correct but should run after the fixed `remainingAmount` calculation above. No code change needed since we're fixing the `remainingAmount` input.

**Verification:**
```bash
# Import an Excel file with totalAmount=0 rows — should be rejected
# Import an Excel file with paidAmount=500, totalAmount=300 — should be rejected or capped
# Import an Excel file with paidAmount=100, totalAmount=500 — remainingAmount should be 400
```

---

### Phase 0.5 — Dashboard Query Fixes

**Problem 1:** `getSummary()` payables query (line 125) has **no date filter** — it sums ALL unpaid invoices regardless of the selected period.

**File:** `src/app/api/dashboard/route.ts`

**Fix at line 125:**
```ts
// Before:
const payablesAgg = await prisma.incomingInvoice.aggregate({
  where: { ...locFilter, status: { in: ["UNPAID", "PARTIAL"] } },
  _sum: { remainingAmount: true },
  _count: true,
});

// After:
const payablesAgg = await prisma.incomingInvoice.aggregate({
  where: {
    ...locFilter,
    status: { in: ["UNPAID", "PARTIAL"] },
    issueDateParsed: dateFilter,
  },
  _sum: { remainingAmount: true },
  _count: true,
});
```

**Problem 2:** `getCashFlow()` (line 187) uses `issueDateParsed` for outflow — this shows when invoices were issued, not when they were paid. Cash flow should use payment dates.

**Fix at line 187:**
```ts
// Before:
prisma.incomingInvoice.aggregate({
  where: { ...locFilter, issueDateParsed: { gte: d, lte: monthEnd } },
  _sum: { totalAmount: true },
}),

// After — use paymentYear/paymentMonth for cash basis:
prisma.incomingInvoice.aggregate({
  where: {
    ...locFilter,
    paymentYear: d.getFullYear(),
    paymentMonth: MONTHS_RO[d.getMonth()],
    paidAmount: { gt: 0 },
  },
  _sum: { paidAmount: true },
}),
```

And update the result mapping at line 196:
```ts
// Before:
outflow: outflow._sum.totalAmount || 0,
// After:
outflow: outflow._sum.paidAmount || 0,
```

**Problem 3:** Extract shared `monthIndex()` utility.

The `monthIndex()` function at line 453 of dashboard route duplicates the pattern of converting Romanian month strings to 0-based indices. Move it to `src/lib/utils.ts`:

```ts
/** Convert Romanian month name to 0-based index. Returns -1 if not found. */
export function monthIndex(monthStr: string): number {
  const idx = MONTHS_RO.indexOf(monthStr.toUpperCase() as typeof MONTHS_RO[number]);
  return idx >= 0 ? idx : -1;
}
```

Then import it in `src/app/api/dashboard/route.ts` instead of the local definition.

**Verification:**
- Dashboard summary payables should change when switching period (month/quarter/year)
- Cash flow chart outflows should reflect when payments were made, not when invoices were issued
- Compare cash flow totals with the Cash Flow Detail view (which already uses `paymentYear`/`paymentMonth` correctly at line 582)

---

### Phase 0.6 — Daily Income Zod Validation

**Problem:** The PUT endpoint at `src/app/api/daily-income/[id]/route.ts` accepts raw `body` with no validation — any shape of JSON is accepted.

**Step 1: Add schema to `src/lib/validations/daily-income.ts`:**
```ts
export const dailyIncomeUpdateSchema = z.object({
  locationId: z.string().optional(),
  date: z.string().optional(),
  totalSales: z.coerce.number().optional(),
  tva: z.coerce.number().optional(),
  salesExVat: z.coerce.number().optional(),
  receiptCount: z.coerce.number().int().optional(),
  avgReceipt: z.coerce.number().optional(),
  barSales: z.coerce.number().optional(),
  barProductCount: z.coerce.number().int().optional(),
  kitchenSales: z.coerce.number().optional(),
  kitchenProductCount: z.coerce.number().int().optional(),
  cashAmount: z.coerce.number().optional(),
  cardAmount: z.coerce.number().optional(),
  transferAmount: z.coerce.number().optional(),
  accountAmount: z.coerce.number().optional(),
  deliveryAmount: z.coerce.number().optional(),
  tipsFiscal: z.coerce.number().optional(),
  tipsTotal: z.coerce.number().optional(),
});
```

**Step 2: Add schema to POST handler too** — `src/app/api/daily-income/route.ts` currently does manual `if (!locationId || !date)` validation at line 110. Replace with:
```ts
export const dailyIncomeCreateSchema = z.object({
  locationId: z.string().min(1, "Locatia este obligatorie"),
  date: z.string().min(1, "Data este obligatorie"),
  totalSales: z.coerce.number().default(0),
  // ... same fields as update but locationId/date required
});
```

**Step 3: Use in PUT handler:**
```ts
import { dailyIncomeUpdateSchema } from "@/lib/validations/daily-income";

const parsed = dailyIncomeUpdateSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: "Date invalide", details: parsed.error.issues }, { status: 400 });
}
const data = parsed.data;
```

---

### Phase 0.7 — Data Cleanup Script

**Problem:** Existing data in the database may have wrong `remainingAmount` and `status` values from before the fixes.

**Create `prisma/scripts/fix-data.ts`:**
```ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Fix incoming invoices
  const incoming = await prisma.incomingInvoice.findMany();
  let fixedCount = 0;

  for (const inv of incoming) {
    const correctRemaining = Math.max(0, Number(inv.totalAmount) - Number(inv.paidAmount));
    let correctStatus = "UNPAID";
    if (Number(inv.paidAmount) > 0 && Number(inv.paidAmount) >= Number(inv.totalAmount)) {
      correctStatus = "PAID";
    } else if (Number(inv.paidAmount) > 0) {
      correctStatus = "PARTIAL";
    }

    if (Number(inv.remainingAmount) !== correctRemaining || inv.status !== correctStatus) {
      await prisma.incomingInvoice.update({
        where: { id: inv.id },
        data: { remainingAmount: correctRemaining, status: correctStatus },
      });
      fixedCount++;
    }
  }
  console.log(`Fixed ${fixedCount} incoming invoices`);

  // Fix outgoing invoices
  const outgoing = await prisma.outgoingInvoice.findMany();
  let fixedOutgoing = 0;

  for (const inv of outgoing) {
    const correctUnpaid = Math.max(0, Number(inv.totalAmount) - Number(inv.paidAmount));
    let correctStatus = "UNPAID";
    if (Number(inv.paidAmount) > 0 && Number(inv.paidAmount) >= Number(inv.totalAmount)) {
      correctStatus = "PAID";
    } else if (Number(inv.paidAmount) > 0) {
      correctStatus = "PARTIAL";
    }

    if (Number(inv.unpaidAmount) !== correctUnpaid || inv.status !== correctStatus) {
      await prisma.outgoingInvoice.update({
        where: { id: inv.id },
        data: { unpaidAmount: correctUnpaid, status: correctStatus },
      });
      fixedOutgoing++;
    }
  }
  console.log(`Fixed ${fixedOutgoing} outgoing invoices`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
```

**Run with:**
```bash
npx tsx prisma/scripts/fix-data.ts
```

**Verification:**
```sql
-- After running, there should be no mismatches:
SELECT COUNT(*) FROM "IncomingInvoice"
WHERE "remainingAmount" != ("totalAmount" - "paidAmount");
-- Should return 0

SELECT COUNT(*) FROM "IncomingInvoice"
WHERE status = 'PAID' AND "paidAmount" < "totalAmount";
-- Should return 0
```

---

### Sprint 0 Checklist

- [ ] Create `src/lib/constants.ts` with VAT_RATE and VAT_MULTIPLIER
- [ ] Replace all 7 hardcoded `1.19` references + 1 inline `0.19`
- [ ] Change Float → Decimal in `prisma/schema.prisma` for all monetary fields
- [ ] Run `prisma migrate dev --name float-to-decimal`
- [ ] Add `serializeDecimal()` to `src/lib/prisma.ts`
- [ ] Wrap all financial API responses with `serializeDecimal()`
- [ ] Fix `parseNumeric()` European format handling
- [ ] Add `totalAmount > 0` validation to both invoice Zod schemas
- [ ] Add `paidAmount <= totalAmount` bounds check to invoice PUT handlers
- [ ] Recalculate `remainingAmount` on import instead of trusting Excel
- [ ] Add date filter to payables query in `getSummary()`
- [ ] Fix `getCashFlow()` to use payment dates for outflows
- [ ] Extract `monthIndex()` to `src/lib/utils.ts`
- [ ] Add Zod schemas for daily-income POST and PUT endpoints
- [ ] Create and run `prisma/scripts/fix-data.ts`
- [ ] Verify all fixes locally with test data

---

## Sprint 1: Security & Auth Hardening

**Goal:** Protect all API routes so no unauthenticated request can read or write data.
**Estimated Duration:** ~1 week
**Definition of Done:** Every API route (except auth) returns 401 for unauthenticated requests. Security headers are set. Rate limiting is active on auth and import endpoints.

### Task 1.1 — Create `src/lib/auth-guard.ts`

The app uses NextAuth v5 beta (`next-auth@5.0.0-beta.30`) with Google OAuth. Auth is configured in `src/auth.ts` but **none of the 22 API routes check the session**.

```ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * Check auth session. Returns null if authenticated, or a 401 Response if not.
 * Usage: const denied = await requireAuth(); if (denied) return denied;
 */
export async function requireAuth(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }
  return null;
}
```

### Task 1.2 — Add Auth to All 22 API Routes

**Pattern:** Add 2 lines at the top of every handler function:

```ts
import { requireAuth } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;
  // ... existing code
}
```

**Files to update (22 route files, ~44 handler functions):**

| Route File | Handlers |
|-----------|----------|
| `src/app/api/locations/route.ts` | GET, POST |
| `src/app/api/locations/[id]/route.ts` | GET, PUT, DELETE |
| `src/app/api/suppliers/route.ts` | GET, POST |
| `src/app/api/suppliers/[id]/route.ts` | GET, PUT, DELETE |
| `src/app/api/customers/route.ts` | GET, POST |
| `src/app/api/customers/[id]/route.ts` | GET, PUT, DELETE |
| `src/app/api/receipts/route.ts` | GET, POST |
| `src/app/api/receipts/[id]/route.ts` | GET, PUT, DELETE |
| `src/app/api/incoming-invoices/route.ts` | GET, POST, PATCH |
| `src/app/api/incoming-invoices/[id]/route.ts` | GET, PUT, PATCH, DELETE |
| `src/app/api/outgoing-invoices/route.ts` | GET, POST, PATCH |
| `src/app/api/outgoing-invoices/[id]/route.ts` | GET, PUT, PATCH, DELETE |
| `src/app/api/daily-income/route.ts` | GET, POST |
| `src/app/api/daily-income/[id]/route.ts` | GET, PUT, DELETE |
| `src/app/api/import/route.ts` | POST |
| `src/app/api/import/preview/route.ts` | POST |
| `src/app/api/import/preview-income/route.ts` | POST |
| `src/app/api/import/commit/route.ts` | POST |
| `src/app/api/import/commit-income/route.ts` | POST |
| `src/app/api/dashboard/route.ts` | GET |
| `src/app/api/search/route.ts` | GET |
| `src/app/api/allowed-emails/route.ts` | GET, POST, DELETE |

**Do NOT add auth to:** `src/app/api/auth/[...nextauth]/route.ts` (it IS the auth handler).

### Task 1.3 — Security Headers in `next.config.ts`

The current `next.config.ts` is empty. Add security headers:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://accounts.google.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### Task 1.4 — Rate Limiting

**Create `src/lib/rate-limit.ts`:**

Simple in-memory rate limiter (no external dependency needed):

```ts
const rateMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs });
    return false; // not limited
  }
  entry.count++;
  return entry.count > limit; // true = rate limited
}
```

Apply to:
- Auth endpoint: 10 requests per minute per IP
- Import endpoints: 5 requests per minute per IP

### Task 1.5 — Create `.env.example`

Document all required environment variables:

```env
# Database (Supabase/PostgreSQL)
DATABASE_URL="postgresql://user:password@host:5432/moro?pgbouncer=true"
DIRECT_URL="postgresql://user:password@host:5432/moro"

# NextAuth
AUTH_SECRET="generate-with: npx auth secret"
AUTH_GOOGLE_ID="your-google-oauth-client-id"
AUTH_GOOGLE_SECRET="your-google-oauth-client-secret"

# Email whitelist (comma-separated, optional — also managed via /api/allowed-emails)
APPROVED_EMAILS="admin@example.com"
```

### Task 1.6 — Zod Validation for Daily Income POST

The POST handler in `src/app/api/daily-income/route.ts` uses manual destructuring with defaults (lines 89-108) and only checks `if (!locationId || !date)`. Replace with the Zod schema from Phase 0.6.

### Sprint 1 Checklist

- [ ] Create `src/lib/auth-guard.ts` with `requireAuth()`
- [ ] Add auth check to all 22 API route files (~44 handlers)
- [ ] Add security headers to `next.config.ts`
- [ ] Create `src/lib/rate-limit.ts` and apply to auth + import routes
- [ ] Create `.env.example` with all 6 environment variables
- [ ] Add Zod validation to daily-income POST handler
- [ ] Test: unauthenticated requests return 401
- [ ] Test: rate limiting kicks in after threshold

---

## Sprint 2: Code Quality & Deduplication

**Goal:** Remove dead code, extract shared patterns, and adopt the tools already installed.
**Estimated Duration:** ~1.5 weeks
**Definition of Done:** No dead dependencies or models. Shared hooks and components reduce page duplication by 50%+. React Query is used for all data fetching.

### Task 2.1 — Remove Dead Dependencies

**File:** `package.json`

Remove these unused packages:
- `axios` — every API call uses `fetch()`. Zero imports of axios in `src/`.
- `dotenv` — Next.js handles `.env` natively. Zero imports of dotenv in `src/`.

```bash
npm uninstall axios dotenv
```

### Task 2.2 — Remove Dead Schema Models

These models exist in `prisma/schema.prisma` but have **zero API routes, zero queries, and zero UI references**:

| Model | Lines | Reason Dead |
|-------|-------|-------------|
| `Employee` | 405-426 | No CRUD routes, no UI |
| `MonthlyPnL` | 202-291 | Dashboard P&L is computed from DailyIncome + IncomingInvoice, not this table |
| `MonthlyCashFlow` | 297-360 | Dashboard Cash Flow is computed live, not from this table |
| `MonthlyCOGS` | 366-400 | Dashboard COGS is computed live |
| `Dividend` | 455-467 | No API routes, no UI |
| `MonthlyForecast` | 482-493 | No API routes, no UI |
| `PlSubcategory` | 440-450 | No queries reference it |

**Before removing:** Create a migration to drop these tables:
```bash
# 1. Remove the model definitions from schema.prisma
# 2. Also remove relation fields from Location model pointing to these
# 3. Run migration
npx prisma migrate dev --name remove-dead-models
```

**Also remove from `Location` model:**
```prisma
// Remove these relation fields:
employees        Employee[]
monthlyPnl       MonthlyPnL[]
monthlyCashFlow  MonthlyCashFlow[]
monthlyCogs      MonthlyCOGS[]
```

**Keep `PlCategory`** — it's used for the taxonomy reference and should be wired up properly (Task 2.6).

### Task 2.3 — Extract Shared Hooks

Both `src/app/incoming/page.tsx` (674 lines) and `src/app/outgoing/page.tsx` (672 lines) duplicate identical patterns for pagination, selection, and data fetching.

**Create `src/hooks/use-paginated-list.ts`:**
```ts
import { useState, useCallback } from "react";

interface UsePaginatedListOptions {
  initialPageSize?: number;
  initialSortBy?: string;
  initialSortDir?: "asc" | "desc";
}

export function usePaginatedList(options: UsePaginatedListOptions = {}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(options.initialPageSize ?? 20);
  const [sortBy, setSortBy] = useState(options.initialSortBy ?? "");
  const [sortDir, setSortDir] = useState<"asc" | "desc">(options.initialSortDir ?? "desc");

  const toggleSort = useCallback((field: string) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
    setPage(1);
  }, [sortBy]);

  return { page, setPage, pageSize, setPageSize, sortBy, sortDir, toggleSort };
}
```

**Create `src/hooks/use-selection.ts`:**
```ts
import { useState, useCallback } from "react";

export function useSelection<T extends string = string>() {
  const [selected, setSelected] = useState<Set<T>>(new Set());

  const toggle = useCallback((id: T) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((ids: T[]) => {
    setSelected((prev) => (prev.size === ids.length ? new Set() : new Set(ids)));
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  return { selected, toggle, toggleAll, clear, count: selected.size };
}
```

### Task 2.4 — Extract Shared `DataTable` Component

Both invoice pages render nearly identical table markup with sorting headers, selection checkboxes, and pagination controls.

**Create `src/components/shared/data-table.tsx`:**

A generic, typed table component that accepts:
- `columns: { key, label, sortable?, render? }[]`
- `data: T[]`
- `pagination: { page, pageSize, total, totalPages }`
- `sorting: { sortBy, sortDir, onSort }`
- `selection?: { selected, onToggle, onToggleAll }`

This should reduce each invoice page from ~670 lines to ~150 lines (filter bar + column definitions + modals).

### Task 2.5 — Adopt React Query

`@tanstack/react-query` is in `package.json` (v5.90.21) but **never imported anywhere in `src/`**. Every page uses raw `fetch` + `useState` + `useEffect`.

**Step 1: Create provider** — `src/components/providers/query-provider.tsx`:
```ts
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

Wire into `src/app/layout.tsx`.

**Step 2: Create query hooks** in `src/hooks/queries/`:
- `use-incoming-invoices.ts` — `useQuery` + `useMutation` for CRUD
- `use-outgoing-invoices.ts` — same pattern
- `use-daily-income.ts` — same pattern
- `use-dashboard.ts` — `useQuery` for each dashboard type
- `use-locations.ts` — `useQuery` for location list (used in many pages)
- `use-suppliers.ts` / `use-customers.ts` — `useQuery` for dropdowns

**Step 3: Replace raw fetch in all pages** with the query hooks. This eliminates:
- Manual loading/error state management
- Duplicate `useEffect` fetch patterns
- Manual cache invalidation

### Task 2.6 — Wire PlCategory from Database

P&L categories are hardcoded in 3 places:
1. `src/app/api/dashboard/route.ts` lines 6-10 — `COGS_CATS`, `PEOPLE_CATS`, etc.
2. `src/lib/utils.ts` line 59 — `PL_CATEGORIES`
3. `src/components/incoming/invoice-form.tsx` — category dropdowns

The `PlCategory` model exists in the schema. Load categories from the database and use them as the source of truth.

### Task 2.7 — Clean Root Directory

Remove files that don't belong in version control:
- `CLAUDEsss.md` — duplicate/draft of CLAUDE.md
- `test-import.xlsx` — test data file
- `screenshot-dashboard.png` — screenshot
- `screenshot-income.png` — screenshot

```bash
rm CLAUDEsss.md test-import.xlsx screenshot-dashboard.png screenshot-income.png
# Add to .gitignore:
echo "*.xlsx" >> .gitignore
echo "screenshot-*.png" >> .gitignore
```

### Task 2.8 — Add Prettier + EditorConfig

No Prettier or EditorConfig exists. The codebase has inconsistent formatting (mixed quote styles, inconsistent trailing commas).

```bash
npm install -D prettier eslint-config-prettier
```

Create `.prettierrc`:
```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

Create `.editorconfig`:
```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

### Sprint 2 Checklist

- [ ] Remove `axios` and `dotenv` from dependencies
- [ ] Remove 7 dead models from schema + migrate
- [ ] Create `src/hooks/use-paginated-list.ts`
- [ ] Create `src/hooks/use-selection.ts`
- [ ] Create `src/components/shared/data-table.tsx`
- [ ] Set up React Query provider in layout
- [ ] Create query hooks in `src/hooks/queries/`
- [ ] Replace raw fetch+useState in all pages with React Query
- [ ] Wire PlCategory from database
- [ ] Clean root directory debris
- [ ] Add Prettier + EditorConfig
- [ ] Format entire codebase with Prettier

---

## Sprint 3: Testing & CI/CD

**Goal:** Establish automated quality gates so regressions can't ship.
**Estimated Duration:** ~2 weeks
**Definition of Done:** Test suite covers all financial calculations. CI pipeline runs on every PR. Pre-commit hooks enforce formatting.

### Task 3.1 — Set Up Vitest

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

**Create `vitest.config.ts`:**
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      reporter: ["text", "lcov"],
      include: ["src/lib/**", "src/app/api/**"],
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
```

**Create `src/test/setup.ts`:**
```ts
import "@testing-library/jest-dom/vitest";
```

**Create Prisma mock** — `src/test/prisma-mock.ts`:
```ts
import { vi } from "vitest";

export const prismaMock = {
  dailyIncome: { findMany: vi.fn(), aggregate: vi.fn(), create: vi.fn(), update: vi.fn() },
  incomingInvoice: { findMany: vi.fn(), aggregate: vi.fn(), create: vi.fn(), createMany: vi.fn(), update: vi.fn() },
  outgoingInvoice: { findMany: vi.fn(), aggregate: vi.fn(), create: vi.fn(), update: vi.fn() },
  location: { findMany: vi.fn(), findUnique: vi.fn() },
  supplier: { findMany: vi.fn(), create: vi.fn() },
  customer: { findMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
```

### Task 3.2 — Financial Calculation Tests

**Create `src/lib/__tests__/constants.test.ts`:**
- VAT_RATE is 0.19
- VAT_MULTIPLIER is 1.19
- `totalAmount / VAT_MULTIPLIER` produces correct exVat for known values

**Create `src/app/api/incoming-invoices/__tests__/route.test.ts`:**
- POST with totalAmount=0 returns 400
- POST calculates amountExVat correctly using VAT_MULTIPLIER
- PUT rejects paidAmount > totalAmount
- Status derivation: paidAmount=0 → UNPAID, paidAmount < total → PARTIAL, paidAmount >= total → PAID
- remainingAmount = totalAmount - paidAmount

### Task 3.3 — Import Pipeline Tests

**Create `src/lib/__tests__/excel.test.ts`:**
- `parseNumeric("1.000,50")` → 1000.50
- `parseNumeric("1,50")` → 1.50
- `parseNumeric("1000.50")` → 1000.50
- `parseNumeric("")` → 0
- `parseNumeric(42)` → 42
- `parseDateFlexible("15/03/2026")` → Date(2026, 2, 15)
- `parseDateFlexible("2026-03-15")` → Date(2026, 2, 15)
- `parseDateFlexible("")` → null

**Create `src/app/api/import/commit/__tests__/route.test.ts`:**
- remainingAmount is always recalculated (not trusted from Excel)
- Status derivation is correct after recalculation
- Duplicate strategy "skip" skips existing invoice numbers
- Duplicate strategy "rename" appends suffix

### Task 3.4 — Dashboard Calculation Tests

**Create `src/app/api/dashboard/__tests__/route.test.ts`:**
- Summary revenue uses DailyIncome.totalSales
- Summary expenses use correct date filter
- Summary payables are filtered by date range
- Cash flow outflows use payment dates (paymentYear/paymentMonth)
- P&L categories sum correctly
- Month index mapping works for all 12 Romanian month names

### Task 3.5 — GitHub Actions CI

**Create `.github/workflows/ci.yml`:**
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Lint
        run: npx eslint src/

      - name: Format check
        run: npx prettier --check "src/**/*.{ts,tsx}"

      - name: Test
        run: npx vitest run --coverage

      - name: Build
        run: npm run build
        env:
          DATABASE_URL: "postgresql://fake:fake@localhost:5432/fake"
          DIRECT_URL: "postgresql://fake:fake@localhost:5432/fake"
          AUTH_SECRET: "ci-test-secret"
```

### Task 3.6 — Pre-commit Hooks

```bash
npm install -D husky lint-staged
npx husky init
```

**`.husky/pre-commit`:**
```bash
npx lint-staged
```

**`package.json` addition:**
```json
{
  "lint-staged": {
    "src/**/*.{ts,tsx}": ["prettier --write", "eslint --fix"],
    "prisma/schema.prisma": ["npx prisma format"]
  }
}
```

### Task 3.7 — Switch to Prisma Migrations

The project currently uses `db push` (no migration history). Switch to migrations for all future schema changes:

```bash
npx prisma migrate dev --name initial-baseline
```

Update the deploy script / README to use `prisma migrate deploy` instead of `prisma db push`.

### Sprint 3 Checklist

- [ ] Install Vitest + React Testing Library
- [ ] Create `vitest.config.ts` and test setup
- [ ] Create Prisma mock for testing
- [ ] Write financial calculation tests (VAT, amounts, status)
- [ ] Write import pipeline tests (parseNumeric, parseDateFlexible)
- [ ] Write dashboard calculation tests
- [ ] Create `.github/workflows/ci.yml`
- [ ] Set up Husky + lint-staged
- [ ] Switch from `db push` to Prisma migrations
- [ ] Verify CI passes on a test PR

---

## Sprint 4: Production Readiness

**Goal:** Add monitoring, logging, caching, and polish for a production-grade application.
**Estimated Duration:** ~1.5 weeks
**Definition of Done:** Errors are captured and reported. Dashboard loads fast. README explains the product. Health endpoint exists for uptime monitoring.

### Task 4.1 — Sentry Error Monitoring

```bash
npx @sentry/wizard@latest -i nextjs
```

This creates `sentry.client.config.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts`. Configure with your Sentry DSN.

### Task 4.2 — Structured Logger

Replace all 44 `console.error` calls across 22 files with a structured logger.

**Create `src/lib/logger.ts`:**
```ts
type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
  };

  // In production, output JSON for log aggregation
  if (process.env.NODE_ENV === "production") {
    console[level](JSON.stringify(entry));
  } else {
    console[level](`[${level.toUpperCase()}] ${message}`, context ?? "");
  }
}

export const logger = {
  info: (msg: string, ctx?: Record<string, unknown>) => log("info", msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => log("warn", msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => log("error", msg, ctx),
};
```

**Replace pattern (all 22 API route files):**
```ts
// Before:
console.error("Dashboard API error:", error);
// After:
logger.error("Dashboard API error", { error: error instanceof Error ? error.message : error });
```

**Files with console.error (44 occurrences across 22 files):**
- `src/auth.ts` (1)
- `src/app/api/daily-income/[id]/route.ts` (3)
- `src/app/api/daily-income/route.ts` (2)
- `src/app/api/dashboard/route.ts` (1)
- `src/app/api/incoming-invoices/route.ts` (3)
- `src/app/api/incoming-invoices/[id]/route.ts` (4)
- `src/app/api/outgoing-invoices/route.ts` (3)
- `src/app/api/outgoing-invoices/[id]/route.ts` (4)
- `src/app/api/suppliers/route.ts` (2)
- `src/app/api/suppliers/[id]/route.ts` (2)
- `src/app/api/customers/route.ts` (2)
- `src/app/api/customers/[id]/route.ts` (2)
- `src/app/api/locations/route.ts` (1)
- `src/app/api/locations/[id]/route.ts` (3)
- `src/app/api/receipts/route.ts` (2)
- `src/app/api/receipts/[id]/route.ts` (3)
- `src/app/api/import/route.ts` (1)
- `src/app/api/import/preview/route.ts` (1)
- `src/app/api/import/preview-income/route.ts` (1)
- `src/app/api/import/commit/route.ts` (1)
- `src/app/api/import/commit-income/route.ts` (1)
- `src/app/api/search/route.ts` (1)

### Task 4.3 — Health Endpoint

**Create `src/app/api/health/route.ts`:**
```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "unknown",
    });
  } catch {
    return NextResponse.json(
      { status: "unhealthy", timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
```

Use this for uptime monitoring (UptimeRobot, Vercel cron, etc.).

### Task 4.4 — Server-side Cache for Dashboard

Dashboard queries are expensive (multiple aggregations per request). Add a simple TTL cache.

**Create `src/lib/cache.ts`:**
```ts
const cache = new Map<string, { data: unknown; expiresAt: number }>();

export function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiresAt) {
    return Promise.resolve(entry.data as T);
  }
  return fn().then((data) => {
    cache.set(key, { data, expiresAt: Date.now() + ttlMs });
    return data;
  });
}

export function invalidateCache(prefix?: string) {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
```

Apply to dashboard route:
```ts
import { cached } from "@/lib/cache";

// In the GET handler:
case "summary":
  return NextResponse.json(
    await cached(`dashboard:summary:${period}:${locationId}`, 60_000, () =>
      getSummary(from, to, locationId)
    )
  );
```

Invalidate cache when invoices or daily income are created/updated (call `invalidateCache("dashboard:")` in those routes).

### Task 4.5 — Add `maxDuration` to Slow Routes

Currently only `src/app/api/import/commit/route.ts` has `maxDuration = 300`. Add to other potentially slow routes:

```ts
// Add to these files:
// src/app/api/import/commit-income/route.ts
export const maxDuration = 300;

// src/app/api/dashboard/route.ts
export const maxDuration = 30;

// src/app/api/import/preview/route.ts
export const maxDuration = 60;

// src/app/api/import/preview-income/route.ts
export const maxDuration = 60;
```

### Task 4.6 — Write Real README

Replace the default Next.js boilerplate `README.md` with:

```markdown
# Moro Coffee Manager

Internal financial management tool for Moro coffee shop chain (MAGNOLIA & ORIZONT locations).

## Features
- Daily income tracking from POS data
- Incoming/outgoing invoice management with Excel import
- P&L dashboard with category breakdown
- Cash flow analysis
- Aging reports for payables/receivables

## Tech Stack
- Next.js 16 + React 19 + TypeScript
- Prisma + PostgreSQL (Supabase)
- NextAuth v5 (Google OAuth)
- Tailwind CSS + Radix UI
- Deployed on Vercel

## Getting Started
1. Copy `.env.example` to `.env.local` and fill in values
2. `npm install`
3. `npx prisma migrate deploy`
4. `npm run dev`

## Deployment
- Push to `main` branch triggers Vercel deployment
- Run `npx prisma migrate deploy` after schema changes
```

### Task 4.7 — Link Help from Within the App

`docs/how-to-use.md` exists (13KB) but is not linked from the app UI. Add a help link in the sidebar (`src/components/layout/sidebar.tsx`).

### Task 4.8 — Product Polish

- **Login page:** Add product description/branding to `src/app/login/page.tsx`
- **Empty states:** Add call-to-action buttons when invoice lists are empty (e.g., "Import your first invoices")
- **Favicon:** Add a proper favicon in `src/app/favicon.ico`

### Sprint 4 Checklist

- [ ] Install and configure Sentry
- [ ] Create `src/lib/logger.ts`
- [ ] Replace all 44 `console.error` calls with `logger.error`
- [ ] Create `src/app/api/health/route.ts`
- [ ] Create `src/lib/cache.ts` and apply to dashboard
- [ ] Add `maxDuration` to slow routes
- [ ] Write proper README.md
- [ ] Link how-to-use.md from sidebar
- [ ] Polish login page, empty states, favicon

---

## Bug Tracker — All 11 Data Bugs from Audit

| # | Bug | Sprint | Phase | Status |
|---|-----|--------|-------|--------|
| 1 | Hardcoded VAT rate `1.19` in 7 places | 0 | 0.1 | Planned |
| 2 | Float for money (73+ fields) causes rounding errors | 0 | 0.2 | Planned |
| 3 | `parseNumeric` breaks on European format `1.000,50` | 0 | 0.3 | Planned |
| 4 | `totalAmount=0` invoices allowed through validation | 0 | 0.4 | Planned |
| 5 | `paidAmount` can exceed `totalAmount` (no bounds check) | 0 | 0.4 | Planned |
| 6 | Import trusts Excel `remainingAmount` instead of recalculating | 0 | 0.4 | Planned |
| 7 | Dashboard payables query has no date filter | 0 | 0.5 | Planned |
| 8 | Cash flow uses `issueDateParsed` instead of payment dates | 0 | 0.5 | Planned |
| 9 | Daily income PUT has no Zod validation | 0 | 0.6 | Planned |
| 10 | Existing data has wrong remainingAmount/status | 0 | 0.7 | Planned |
| 11 | Daily income POST uses manual validation instead of Zod | 1 | 1.6 | Planned |

---

## Audit Dimension Coverage

| Dimension | Score | Key Fixes | Sprints |
|-----------|-------|-----------|---------|
| 1. Velocity & Shipping Speed | 6/10 | CI/CD pipeline, pre-commit hooks | 3 |
| 2. Architecture & Project Structure | 6/10 | Remove dead models, extract shared components, React Query | 2 |
| 3. Claude Code Effectiveness | 7/10 | Deduplication, consistent patterns | 2 |
| 4. Decision-Making & Scope | 5/10 | Remove dead dependencies, clean debris, focus scope | 2 |
| 5. Code Quality & Craft | 4/10 | Zod validation, Decimal migration, Prettier, testing | 0, 2, 3 |
| 6. Product & Messaging | 4/10 | README, help link, login polish | 4 |
| 7. Deployment & Operations | 3/10 | Auth guard, security headers, .env.example, Sentry, health endpoint | 1, 4 |
| 8. Learning & Iteration Loops | 5/10 | This sprint plan, CI feedback loops, migration history | 3 |

---

## Key File Index

Quick reference for all files created or modified in this overhaul:

### New Files
| File | Sprint | Purpose |
|------|--------|---------|
| `src/lib/constants.ts` | 0 | VAT_RATE, VAT_MULTIPLIER |
| `prisma/scripts/fix-data.ts` | 0 | One-time data cleanup |
| `src/lib/auth-guard.ts` | 1 | Shared `requireAuth()` |
| `src/lib/rate-limit.ts` | 1 | In-memory rate limiter |
| `.env.example` | 1 | Environment variable docs |
| `src/hooks/use-paginated-list.ts` | 2 | Shared pagination hook |
| `src/hooks/use-selection.ts` | 2 | Shared selection hook |
| `src/components/shared/data-table.tsx` | 2 | Reusable table component |
| `src/components/providers/query-provider.tsx` | 2 | React Query provider |
| `src/hooks/queries/*.ts` | 2 | React Query hooks |
| `.prettierrc` | 2 | Prettier config |
| `.editorconfig` | 2 | Editor config |
| `vitest.config.ts` | 3 | Test runner config |
| `src/test/setup.ts` | 3 | Test setup |
| `src/test/prisma-mock.ts` | 3 | Prisma mock for tests |
| `src/lib/__tests__/constants.test.ts` | 3 | VAT calculation tests |
| `src/lib/__tests__/excel.test.ts` | 3 | Import parsing tests |
| `src/app/api/**/__tests__/*.test.ts` | 3 | API route tests |
| `.github/workflows/ci.yml` | 3 | CI pipeline |
| `src/lib/logger.ts` | 4 | Structured logger |
| `src/lib/cache.ts` | 4 | Dashboard cache |
| `src/app/api/health/route.ts` | 4 | Health check endpoint |

### Modified Files (most impactful)
| File | Sprints | Changes |
|------|---------|---------|
| `prisma/schema.prisma` | 0, 2 | Float→Decimal, remove dead models |
| `src/lib/prisma.ts` | 0 | Add serializeDecimal() |
| `src/lib/excel.ts` | 0 | Fix parseNumeric() |
| `src/lib/utils.ts` | 0 | Add monthIndex() |
| `src/lib/validations/incoming-invoice.ts` | 0 | totalAmount > 0 |
| `src/lib/validations/outgoing-invoice.ts` | 0 | totalAmount > 0 |
| `src/lib/validations/daily-income.ts` | 0, 1 | Add create/update schemas |
| `src/app/api/dashboard/route.ts` | 0, 4 | Fix queries, add cache |
| `src/app/api/import/commit/route.ts` | 0 | Recalculate remainingAmount |
| `src/app/api/*/route.ts` (all 22) | 1, 4 | Auth guard, logger |
| `next.config.ts` | 1 | Security headers |
| `package.json` | 2, 3 | Remove/add deps, lint-staged |
| `src/app/incoming/page.tsx` | 2 | Shared hooks + React Query |
| `src/app/outgoing/page.tsx` | 2 | Shared hooks + React Query |
| `README.md` | 4 | Real documentation |
