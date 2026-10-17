# PR #461 follow-up — company validation before invoice side effects

Date: 2026-10-17
Repository: `Kilchi555/driving-team-app`
Baseline (`origin/main` at branch creation): `a9a9745123e124d51ad5fa13a84523055c3a90ef`
Branch: `cursor/invoice-company-before-side-effects-7efe`
Draft PR: https://github.com/Kilchi555/driving-team-app/pull/466
Implementation commit: `91fe9d62a172e77a2dad63754443b2686b06a3d8`
PR #461 was not modified, reverted, or reopened.

No migration was added or applied. No production or shared-staging SQL ran. No existing invoice, payment, credit, wallet balance, or ledger row was read or written. No deploy, undraft, merge, or workflow dispatch ran.

## Implementation gate

CHANGE CLASS: API, authorization, multi-tenant isolation, privileged Supabase client. The handler can also apply student credit before insert, so the path is payment-adjacent.

In scope: move the existing company check in `POST /api/invoices/create` ahead of number allocation and credit application, and insert only the id returned by that check.

Out of scope: schema or RLS, historical rows, send-draft, persist, auto-invoice, course invoices, staff POS, resource invoices, quote conversion, and payment-provider behavior.

Hotspots: P0 multi-tenant isolation and the service-role client. Dependency of invoice creation and optional student-credit application.

Change risk: **CRITICAL**. The change is a check-order fix on an existing tenant lookup. It does not add a new writer or a new payment path.

Decision: the user order for this follow-up is the approval. Scope stayed inside that order.

Recommendation: implement with caution. Human review and the required ruleset checks remain before merge.

## Root cause

On `main` at `a9a97451`, `server/api/invoices/create.post.ts` authenticated the caller and checked the admin/staff role, then allocated an invoice or quote number and, for a non-quote with `apply_available_credit`, called `applyStudentCreditToPayments`. Only after those writes did it look up `invoiceData.company_id` in `companies` for the caller's `tenant_id`.

A foreign-tenant, unknown, or invalid company id, and a company lookup that returned no row, therefore rejected the request only after a number had already been consumed and after student credit could already have been applied. The insert then stored `invoiceData.company_id` itself, not the id loaded from the company row. A lookup error was ignored and collapsed into the same missing-row `403`.

## Files changed

- `server/utils/invoice-company-link.ts`
- `server/api/invoices/create.post.ts`
- `server/utils/__tests__/invoice-create-company-order.test.ts`
- `artifacts/handoffs/PR_461_COMPANY_VALIDATION_ORDER_FIX.md`

`companyIdInTenant` is the existing lookup that used to live inside `companyIdForInvoiceInsert`: explicit id, UUID check, `companies` select by `id` and `tenant_id`, fail closed, return `data.id`. `companyIdForInvoiceInsert` still returns null when `billing_type` is not `company`, then calls `companyIdInTenant`. Send-draft behavior is unchanged.

`POST /api/invoices/create` calls `companyIdInTenant` directly so a supplied id is still checked and stored when `billing_type` is `individual`.

## Validation order

Before:

1. Authenticate and require admin or staff in the caller tenant.
2. Require `invoiceData` and `items`.
3. `allocateQuoteNumber` or `allocateInvoiceNumber`.
4. Optional `applyStudentCreditToPayments`.
5. If `company_id` is present, select `companies` by id and tenant. Missing row: `403`.
6. Insert `company_id: invoiceData.company_id || null`.

After:

1. Authenticate and require admin or staff in the caller tenant.
2. Require `invoiceData` and `items`.
3. `companyIdInTenant` on the submitted `company_id`.
   - Absent or `''`: no company query, stored link is null.
   - Invalid UUID: `400`, no company query.
   - Lookup error: `503`.
   - Unknown or other-tenant company: `404`.
   - Match: keep `data.id`.
4. `allocateQuoteNumber` or `allocateInvoiceNumber`.
5. Optional `applyStudentCreditToPayments`.
6. Insert `company_id: linkedCompanyId`.

The status for a rejected company id changes from `403` to the helper codes `400`, `404`, and `503`. Each of those still fails closed before a number, credit, or invoice row. A company name without an id still does not query `companies` and does not create a link.

## Tests

Commands, run from `/workspace` on 2026-10-17:

```text
npx vitest run \
  server/utils/__tests__/invoice-create-company-order.test.ts \
  server/utils/__tests__/invoice-company-link.test.ts \
  server/utils/__tests__/invoice-company-link.db.test.ts \
  server/utils/__tests__/invoice-tenant-isolation.test.ts
```

Result: 4 files, 46 tests passed (8 new handler-order tests, 19 company-link unit tests, 6 disposable PGlite tests, 13 tenant-isolation tests).

The new handler tests use an in-memory Supabase stand-in and mocked number and credit functions. They show:

- foreign-tenant company: `404`, no number, no credit, no invoice row
- unknown company: `404`, same
- invalid UUID: `400`, no `companies` query, same
- company select error: `503`, same
- same-tenant company: stored `company_id` is the company row id; order is company, invoice number, credit
- absent company id: `company_id` null, no company query
- company name and customer membership without a company id: `company_id` null, no company query
- individual billing plus a same-tenant company id: the id is stored

```text
npx eslint server/utils/__tests__/invoice-create-company-order.test.ts \
  server/utils/__tests__/invoice-company-link.test.ts \
  server/utils/__tests__/invoice-company-link.db.test.ts \
  server/utils/invoice-company-link.ts --max-warnings 0
npm run lint
```

Both exited 0. `npm run lint` is ESLint on `server/utils/__tests__/**/*.ts` only, which is the CI lint scope.

`npx tsc -p .nuxt/tsconfig.server.json --noEmit` was started against the server project and aborted with `JavaScript heap out of memory` after about 151 seconds. It emitted no diagnostic for the changed files before the process died. That is an environment limit of the full server typecheck. CI does not run a typecheck. This is not a diagnosed type error in the patch.

No production data was used.

## Existing data and payments

This change does not update or delete invoices, payments, credits, wallet balances, or ledger rows. Tests insert only into the in-memory mock or the disposable PGlite schema already used by the company-link tests. No migration file was added.

## Remaining risks and human gates

- The company check and the invoice insert are still separate statements. A company row can change between the check and the insert. There is still no database constraint that `invoices.company_id` belongs to `invoices.tenant_id`. That constraint is out of scope.
- `persistAndSendInvoiceDraft` still trusts a `linkedCompanyId` that the caller already computed. Send-draft computes it before credit. This PR does not change that path.
- Callers that matched the old `403` for a bad company id on this route now receive `400`, `404`, or `503`. The request still fails before side effects.
- Required human gates: review of this draft, required ruleset checks on its head (**Test and lint**, **E2E login**, **Dependency review**), and a human merge into `main`. Production deploy follows that merge. No production SQL is part of this change.
