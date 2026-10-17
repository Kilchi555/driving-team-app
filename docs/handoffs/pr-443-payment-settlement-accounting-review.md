# PR #443 payment settlement accounting review

Date: 2026-10-16

Verdict: `CONDITIONAL PASS — EXPLICIT HUMAN DECISION REQUIRED`

This verdict does not authorize a merge, undraft, deployment, or migration application.

## 1. Observation

- Repository: `Kilchi555/driving-team-app`
- Pull request: https://github.com/Kilchi555/driving-team-app/pull/443
- State at the start of this review: draft, head `9922b1d840bed41d993600656edc6b6a329fe589`, GitHub base `main` at `ecf9694ff5b6626539ad0230fee2ca1c3a3d6121`
- Working branch: `cursor/invoice-payment-tenant-scope-4274`
- The branch was not synchronized onto later `main`. The commits still sit on `e1248c0b7fc5a08a439e9c3e1c15a3ce175a1a2e`.
- Required checks on `9922b1d8` were already green: Test and lint, E2E login, Dependency review. `App | Default` and `App | Default | Archive - iOS` failed and are not ruleset checks.
- This document is in the follow-up commit. Read `gh pr view 443 --json headRefOid,isDraft,statusCheckRollup` and judge the required checks on that tip. Do not reuse the `9922b1d8` result for the new tip.
- PR #460 was not opened or modified.

Implementation gate for this follow-up: payment settlement is CRITICAL. The task authorized only fixes that the existing code already determines. The three policy choices below were not implemented.

## 2. Files

Inspected, among others: `migrations/20261016_payment_settlement_atomicity.sql`, `database_migration_invoices.sql`, `sql_migrations/20260721_camt_import_dedup.sql`, `server/api/invoices/mark-invoice-paid.post.ts`, `server/api/invoices/mark-paid.post.ts`, `server/api/staff/process-bulk-payment.post.ts`, `server/utils/invoice-credit.ts`, `server/utils/bank-reconciliation.ts`, `server/utils/staff-pos-deferred-overpayment.ts`, `server/api/affiliate/process-reward.post.ts`, `components/admin/InvoiceDetailModal.vue`, `components/admin/CamtImportModal.vue`, `composables/useInvoices.ts`.

Changed:

- `server/utils/invoice-credit.ts`
- `server/api/staff/process-bulk-payment.post.ts`
- `server/utils/__tests__/invoice-credit.test.ts`
- `server/utils/__tests__/invoice-payment-tenant-scope.http.test.ts`
- `server/utils/__tests__/payment-settlement-atomicity.pg.test.ts`
- this file

Not changed: the settlement SQL, the journal-versus-header amounts, RLS, grants, PR #460, production, or staging.

## 3. Decision A — overpayment

Facts:

- `invoices.paid_amount_rappen` is the amount allocated to the invoice. The function stores `least(previous + requested, total)`.
- `invoice_payments` is the payment record for that invoice. Its schema is a payment (`payment_method`, `payment_reference`, `amount_rappen`, `payment_date`), and `amount_rappen` must be greater than 0. The insert stores the requested amount.
- `bank_import_records.amount_rappen` stores that same requested amount. The unique key is `(tenant_id, dedupe_key)`.
- `applyInvoiceCreditOnPaid` credits invoice lines flagged `credit_to_wallet`. It does not credit the cash surplus.
- Bulk cash has a separate surplus: money above the selected payments' remaining due is written to `student_credits` after the batch. That path is not the invoice-header path.
- There is no unapplied-payment table and no refund-liability table on this path.

Example. Invoice outstanding CHF 80.00 (8000 rappen). Receipt CHF 100.00 (10000 rappen).

| Store | Amount |
| --- | --- |
| Invoice header `paid_amount_rappen` | 8000 |
| `invoice_payments.amount_rappen` | 10000 |
| `bank_import_records.amount_rappen`, when a bank key is present | 10000 |
| Student wallet from this function | 0 |

The CHF 20.00 difference is only the gap between the receipt and the capped header. Reports that sum the journal will not match the header.

Recommendation, not a new rule: keep this split. The journal and the bank row are the receipt. The header is the allocation. Reducing the journal to 8000 would hide the receipt and disagree with the bank row. Creating a wallet credit here would invent a third store that this function does not write.

Human decision still required before anyone changes it:

> For a receipt above the invoice remainder, should the surplus stay as this journal-versus-header gap, be credited to `student_credits`, or be rejected?

Until that is answered, the code keeps the gap.

## 4. Decision B — duplicate partials

Facts:

- A bank or CSV import already has a stable identity: `camt_dedupe_key`, stored as `bank_import_records (tenant_id, dedupe_key)`. A second call with the same key raises `duplicate_bank_import` inside the settlement function, so the second journal does not commit.
- Two different keys are two payments, even when the amount is the same. Both journals are inserted.
- The manual invoice dialog and `useInvoices.markInvoiceAsPaid` send no key. A second partial of the same amount is a new payment. Two CHF 40.00 installments on a CHF 100.00 invoice are legitimate.
- A second manual call is a no-op only after the invoice is already fully paid and the call has no new bank key.
- The invoice row is locked `FOR UPDATE` for the duration of one call. Two concurrent calls with the same bank key serialize on that lock and then on the unique key. One commits. The other raises `duplicate_bank_import`.
- This was executed as two sequential calls on one disposable Postgres connection. A second parallel session was not opened. The unique constraint is the race guard.

No change was made to reject a keyless repeat. Deduplicating by invoice id and amount would reject a real second installment.

Human decision still required:

> Should the manual dialog be required to send a caller-generated idempotency key? Calls without a key stay new payments. The key must not be derived from the invoice id and the amount.

## 5. Decision C — side effects

| Follow-up | What it is | Failure and retry | Change in this follow-up |
| --- | --- | --- | --- |
| Product wallet credit (`applyInvoiceCreditOnPaid`) | Separate credit for flagged invoice lines. Not the cash surplus. | Stays outside the settlement. The handler still warns and leaves the invoice paid. The ledger row is now inserted before the balance, so a failed ledger insert does not move the wallet. A later call that already sees the ledger row does not add the credit again. | Write order only. |
| Appointment confirmation | Separate status change from `pending_confirmation` to `confirmed`. The filter makes a second call a no-op. | A completed-payment replay used to skip this step. The replay now confirms a still-pending appointment and does not rewrite the payment amount. | Restored on the cash skip path. |
| Affiliate reward | Separate HTTP call. `process-reward` returns `already_credited_for_this_course`. A cron retries it. | Stays outside. A failed call does not roll the payment back. | None. |
| Bulk cash surplus | Part of the same cash tender, but written after the batch with no reference id. | Stays outside. If every selected payment is already completed, remaining due is 0, and a repeated tender can be deposited again as a new surplus. The staff-POS deferred function is a different key and must not be called from this bulk path. | None. |

Residual, not fixed:

- If the product-credit ledger insert succeeds and the balance update then fails, the next call sees the ledger row and skips. The wallet can stay short. It will not be credited twice by that retry.
- Two overlapping product-credit calls can both pass the "no ledger row yet" check. No unique index was added, because production rows were not inspected.
- The bulk surplus still has no identity. Putting it inside the cash function would change today's non-fatal behavior, so it was not moved.

Human decision still required:

> Should a failed product-wallet credit, appointment confirmation, affiliate call, or bulk surplus deposit roll the settlement back? And should the bulk surplus require a caller-supplied key so a retry cannot deposit it again?

## 6. Tests

Disposable Postgres, `npx vitest run server/utils/__tests__/payment-settlement-atomicity.pg.test.ts`: 12 passed. This file executes the SQL functions. It covers the CHF 80 / CHF 100 split, a repeated bank key with no second journal, two same-amount payments with different keys, two keyless partials of the same amount, and the earlier rollback cases.

Mocked handler and credit tests, not transaction proof:

- `invoice-payment-tenant-scope.http.test.ts`: 23 passed. The completed-payment replay confirms a pending appointment and does not update the payment. The file's `rpc()` comment says it is not a database transaction.
- `invoice-credit.test.ts`: 10 passed. The client is an in-memory fake. Ledger failure does not call the balance write. An existing ledger row skips.
- `cash-settlement-due.test.ts`: 4 passed.
- `staff-pos-completion.test.ts`: 41 passed.
- `npm run lint`: passed.
- `npm test` on this commit, with the untracked pre-merge audit file moved out of the worktree: 3200 vitest tests passed, and `scripts/ci/validate-supabase-db-url.test.mjs` passed (17). The audit file was not committed.

`npx nuxi typecheck` was not run. The repo `tsconfig.json` has a trailing comma that already breaks it, and that file was not edited.

## 7. Migration and rollout

`migrations/20261016_payment_settlement_atomicity.sql` is only in this branch. It was not applied to production or staging.

The functions were executed in disposable PGlite against the columns they write. That database is not a copy of production. The insert list was compared with `sql_migrations/20260721_camt_import_dedup.sql` and the invoice-payment table in `database_migration_invoices.sql`.

Rollout order, when a person later chooses to ship:

1. Apply `migrations/20261016_payment_settlement_atomicity.sql` in a reviewed database session.
2. Deploy the handlers after that function exists.

If the handlers are deployed first, the RPC name is missing. The handler returns 500 and does not write the payment, the invoice, or the journal. That is fail-closed, not a successful settlement.

## 8. Prohibited actions

No production or staging database write. No invoice was marked paid. No Stripe or Wallee charge, refund, or other live payment call. No secret change. No workflow dispatch. No merge, approval, or undraft. No sync with `main`. PR #460 was not modified.

## 9. Next action

A reviewer decides the three questions in sections 3, 4, and 5. Until then, do not change the journal amount, do not reject a keyless partial, and do not pull the bulk surplus into the settlement transaction.

Then read the required checks on the commit that contains this file. Keep the pull request a draft.
