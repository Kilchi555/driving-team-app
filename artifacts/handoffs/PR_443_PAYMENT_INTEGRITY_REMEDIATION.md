# PR #443 payment integrity remediation

Date: 2026-10-16

Verdict: draft only. The sibling-read regression is fixed on the updated branch. Header, journal, and ledger consistency is not changed, because no single business rule is established.

## Branch

- Repository: `Kilchi555/driving-team-app`
- Branch: `cursor/invoice-payment-tenant-scope-4274`
- Base: `e1248c0b7fc5a08a439e9c3e1c15a3ce175a1a2e` (`origin/main` at fetch on 2026-10-16)
- Previous pull request head: `5f18f108e60128e6dffe946afebc5927c043ac26`
- Rebased tenant-scope commit: `8fd3e7668f91fb43af5516b7e194e344c7119302`
- Fail-closed commit: `7d333349c93b083976b7972765e56328aba0b7b1`
- This handoff is committed directly above the fail-closed commit. The draft pull request head is that later commit.
- Pull request: https://github.com/Kilchi555/driving-team-app/pull/443 (remains draft)

`origin/main` was five commits ahead of the old base `254a2d95e770ae69153631fe406ddb74560baec3`. Those commits do not touch the seven payment files. The branch was rebased onto `e1248c0b7fc5a08a439e9c3e1c15a3ce175a1a2e`, which rewrote `5f18f108` to `8fd3e766`.

## What changed

`server/api/invoices/mark-paid.post.ts`

An admin cash completion loads sibling `payments` for the invoice (same tenant, plus rows whose `tenant_id` is null) and sets the invoice to `paid` only when every returned row is `completed`. The previous code replaced a null read with `[]`. `[].every(...)` is true, so a failed read marked the invoice paid.

The handler now returns 500 when either read returns an error or a null payload. A successful empty list is unchanged: there is no sibling row, and the status rule stays the existing `every` check. The payment row is still updated before that read. A failed read therefore leaves the payment `completed` and the invoice `pending`. There is no transaction around those two writes.

No amount formula, journal insert, or `paid_amount_rappen` write was added.

## Files against `origin/main`

- `server/api/admin/payment-invoice-lookup.get.ts`
- `server/api/invoices/get-items.get.ts`
- `server/api/invoices/mark-invoice-paid.post.ts`
- `server/api/invoices/mark-paid.post.ts`
- `server/api/staff/process-bulk-payment.post.ts`
- `server/utils/__tests__/invoice-payment-tenant-scope.http.test.ts`
- `server/utils/__tests__/staff-pos-completion.test.ts`
- `artifacts/handoffs/PR_443_PAYMENT_INTEGRITY_REMEDIATION.md`

The first seven files are the rebased #443 diff plus the fail-closed change. No other application file was edited.

## Tests

On commit `7d333349c93b083976b7972765e56328aba0b7b1`, with a clean worktree:

- `npm test`: 3177 vitest tests passed, plus `scripts/ci/validate-supabase-db-url.test.mjs` (17 passed)
- `npm run lint`: passed

New regression coverage in `invoice-payment-tenant-scope.http.test.ts`:

- sibling `payments` select number 2 fails: HTTP 500, invoice stays `pending`, no invoice write
- sibling `payments` select number 3 (null `tenant_id`) fails: HTTP 500, invoice stays `pending`

Already covered and left in place:

- same-tenant partial payment stays `partial`
- null-tenant open payment stays `partial`; another tenant is ignored
- foreign payment and foreign invoice return 404 before a write
- invoice update matching zero rows returns 404
- `mark-invoice-paid` partial amount, zero-amount full booking, foreign invoice, and zero-row update
- bulk foreign id rejection and foreign invoice sync failure

Not added, because they would freeze or invent the unresolved ledger rules below:

- journal insert failure
- overpayment amount
- duplicate settlement
- a rollback of the payment row when the sibling read fails

## Stopped: ledger consistency

These behaviors are still in the code. They were not given a new rule.

1. `mark-paid` does not write `invoices.paid_amount_rappen` or `invoice_payments`. The existing test locks that. Staff and `tenant_admin` do not update the invoice header. Only `admin` updates `payment_status` / `paid_at`.
2. `mark-invoice-paid` uses `paid_amount_rappen || invoice.total_amount_rappen`. A supplied `0` books the full total. The test locks that.
3. The header stores `min(previouslyPaid + newPayment, total)`. The journal insert stores `newPayment`, which is the unclamped requested amount. An overpayment can make the header and the journal disagree.
4. The journal `insert` result is ignored. The handler can return success after the header update when the journal write fails.
5. The handler is sequential service-role code. Production has `staff_pos_sale`. It does not have `mark_invoice_paid_core` or `apply_invoice_wallet_credit`. A later 500 cannot undo the header update.
6. `process-bulk-payment` does not write `paid_amount_rappen` or `invoice_payments`. A `completed` retry counts the already-paid amount as 0 unless `payment_status` is `partial`, and can book the full due again. That predates #443.

`POST /api/invoices/update` on current main rejects payment fields (`57543d57`). That allowlist was not changed here. It does not define the settlement formula.

## Decisions required before any further payment edit

1. Which store is authoritative when `payments`, `invoice_payments`, and `invoices.paid_amount_rappen` disagree?
2. Does a requested amount of `0` mean "full remaining balance" or "book nothing"?
3. On an overpayment, does the journal store the requested amount or only the remainder that fits the total?
4. Must a failed journal insert roll back the header? That needs one database transaction or a production RPC. This route does not have either.
5. Should admin cash completion in `mark-paid` write the same ledger as `mark-invoice-paid`?
6. What should a repeated `completed` bulk or mark-paid call do: no-op, or book again?

Until those are decided, do not change the success-path amounts.

## Remaining risks

- The payment update and the invoice update are still not atomic. A failed sibling read now avoids a false `paid` invoice, and leaves a `completed` payment.
- Failed journal writes can still return a paid header with no journal row.
- `invoice_payments_tenant_access` is unchanged. Privilege work is the other draft.
- Required CI on this new head was not green at handoff time. The previous green checks were for `5f18f108`, which is not this head.

## Next human gate

Review the draft. Do not mark it ready, merge it, deploy it, or mark a real invoice paid. After the required checks (Test and lint, E2E login, Dependency review) are green on the exact head, a person can decide whether to merge the tenant-scope and fail-closed fix. Ledger work stays blocked on the decisions above.
