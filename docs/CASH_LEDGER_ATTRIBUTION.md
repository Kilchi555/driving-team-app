# Cash ledger attribution foundation

Verified from `main` after merge of `646f4287` (#369).

## Intent

Separate **who took the cash** from **who delivered the lesson**, and give historical appointment cash a documented proxy without pretending the instructor was the cashier.

This is additive schema + classifiers only. It does **not** rewrite payment status, refunds, or accounting booking.

## Attribution values

| `cash_transactions.attribution` | Meaning |
|---|---|
| `cashier_staff` | Proven cashier; requires non-null `cashier_staff_id` |
| `legacy_service_staff` | Historical proxy via `service_staff_id`; **cashier unknown**; `cashier_staff_id` must be NULL |
| `unknown` | Not yet attributed; used for **new** appointment cash inserts so a later backfill cannot treat them as legacy |
| `NULL` | Allowed for non-appointment cash (product sale, credit deposit) and pre-backfill history |

`legacy_service_staff` does **not** mean the appointment staff took the cash.

## Architecture

```
TS classifier (spec)          SQL twin (must stay in step)
─────────────────────         ────────────────────────────
cash-ledger-attribution.ts →  cash_ledger_classify_payments(p_tenant_id)
  classifyHistoricalCashPayment
  cashAmountIsExact
  applyLegacyAttribution
  attributionForNewCashInsert → cash_transactions_protect_attribution trigger
```

Read-only classify → candidates → optional write:

1. `cash_ledger_classify_payments(tenant)` — no writes
2. `cash_ledger_legacy_candidates(tenant)` — filter of classifiable rows
3. `apply_legacy_cash_attribution(tenant)` — sets `service_staff_id`, `attribution = legacy_service_staff`, `tenant_id`; **never** sets `cashier_staff_id`; refuses rows that already have cashier or attribution

All three RPCs: `GRANT EXECUTE` to `service_role` only (revoked from PUBLIC / anon / authenticated).

## Classifier contract (`classifyHistoricalCashPayment`)

Include as `legacy_service_staff` only when **all** hold:

- `payment_method = cash`, `payment_status = completed`, has `appointment_id`
- payment staff = appointment staff; both tenants match `scopeTenantId`
- cash row tenant null or same as payment tenant
- not a successful refund / refunded payment
- if method was switched onto cash, original method was **not** already completed/paid
- amount is exact (`cashAmountIsExact`): no credit used, no refund amount, exactly one cash row matching payment total, partial sum 0 or equal to total

Exclude reasons: `not_completed_cash`, `identity`, `refund`, `original_completed`, `ambiguous`, `foreign_tenant`.

Legacy buckets (reporting only): `legacy_no_switch`, `legacy_wallee`, `legacy_invoice`, `legacy_other_switch`.

## Insert / protect rules

`attributionForNewCashInsert`:

- Reject inserting `legacy_service_staff` from the app path (`reject_legacy_insert`)
- Appointment cash with null attribution → coerce to `unknown`
- Non-appointment cash may keep null attribution

Trigger `cash_transactions_protect_attribution` enforces the same idea in SQL: clients cannot assign cashier / legacy proxy via ordinary column grants (table INSERT/UPDATE replaced with grants that omit `cashier_staff_id`, `service_staff_id`, `attribution`).

## Schema / migration

| File | Role |
|---|---|
| `migrations/20261004_cash_ledger_foundation.sql` | Adds columns, checks, indexes, classify/apply RPCs, protect trigger. Header: **do not apply from app deploy**; **do not call `apply_legacy_cash_attribution()` against production from this change**. |

Presence in the repo ≠ production applied.

## Constraints & pitfalls

1. **Do not call the apply RPC casually** — it writes historical attribution; ops must decide tenant + timing.
2. Keep TS and SQL classifiers in step; tests live in `server/utils/__tests__/cash-ledger-attribution.test.ts`.
3. Product-sale / credit-deposit cash has no appointment → legacy classifier never sees them; leave attribution null unless a future cashier path sets `cashier_staff`.
4. A row with `cashier_staff_id` or any attribution is never overwritten by legacy apply.
5. Not related to Staff POS credit timing (#360) or Wallee recovery.

## Codepaths

- `server/utils/cash-ledger-attribution.ts`
- `server/utils/__tests__/cash-ledger-attribution.test.ts`
- `migrations/20261004_cash_ledger_foundation.sql`
