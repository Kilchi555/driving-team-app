# PR #443 payment integrity remediation

Date: 2026-10-16

Verdict: `PARTIAL — SPECIFIC ACCOUNTING DECISIONS OR TESTS BLOCKED`

The atomic cash and invoice settlement path was executed in a disposable in-process Postgres. Production was not changed. Two accounting choices are still open, so this is not a pass.

## 1. Current head and observed state

- Repository: `Kilchi555/driving-team-app`
- Branch: `cursor/invoice-payment-tenant-scope-4274`
- Pull request: https://github.com/Kilchi555/driving-team-app/pull/443 (draft)
- Known previous head: `8fb21a2970c3667d0e20c43f18257ae5d144d2a8`
- Functional commit: `a9215f44aff388c86b5a1dc43d13d3ead0a730ce`
- Draft head: the commit that contains this document. Read `gh pr view 443 --json headRefOid` before review. Required checks apply to that tip.
- Branch base used for these commits: `e1248c0b7fc5a08a439e9c3e1c15a3ce175a1a2e`
- This branch was not synchronized onto later `main`. At the start of this change GitHub reported the PR base as `ecf9694ff5b6626539ad0230fee2ca1c3a3d6121`.

Already fixed before this change, and still in place:

- Tenant predicates and generic not-found responses from `8fd3e7668f91fb43af5516b7e194e344c7119302`
- A failed or null sibling read no longer marks the invoice paid (`7d333349c93b083976b7972765e56328aba0b7b1`)

Still true at `8fb21a29`, and now changed: that fail-closed read happened after the payment row was updated, so a failure left the payment `completed` and the invoice `pending`.

## 2. Findings fixed and remaining

Fixed in `a9215f44`:

- `mark-paid` no longer updates the payment and then reads siblings over a separate HTTP call. Both writes are inside `complete_tenant_cash_payment`. An exception rolls the payment write back.
- A null RPC payload is a failure. It is not treated as an empty sibling list.
- A successful empty sibling set in `complete_tenant_cash_payment` is still all paid (`bool_and` of no rows is null, coalesced to true).
- The bulk cash path uses the opposite empty rule it already had: an empty sibling set is not all paid.
- `settle_marked_invoice_payment` updates the header, inserts the journal, completes open payment rows, and applies staff-POS credit in one function. A journal or staff-POS exception rolls the header back.
- Bank dedupe insert is inside that function. A unique violation raises `duplicate_bank_import` and does not leave a dedupe row without the booking, or a booking without the dedupe row.
- A `payments` row that is already `completed` is not given another cash amount by `apply_cash_settlement_batch` or by the bulk due calculation.
- A second manual `settle_marked_invoice_payment` on an invoice that is already `paid` and whose `paid_amount_rappen` is at least the total does not insert another journal row, unless it carries a new bank dedupe key.
- A cash batch whose invoice is not in the actor tenant rolls the payment update back.

Remaining:

- The journal still stores the requested amount. The header still stores `least(previous + requested, total)`. They can disagree on an overpayment. Not reconciled.
- A second partial installment of the same amount, with no idempotency key, still books again. A repeated call is only a no-op once the invoice is already fully paid, or when the bank dedupe key collides.
- `applyInvoiceCreditOnPaid` still runs after the settlement function and still logs a warning on failure. That wallet write is outside the transaction because the existing handler treats it as non-fatal.
- Appointment confirmation, the affiliate HTTP call, and the bulk overpayment credit upsert stay outside the cash batch transaction. Appointment and affiliate failures were already non-fatal. The overpayment credit failure was already logged and not rethrown.
- The migration has not been applied. Until a person applies it, these RPC names do not exist in the database. The handlers will fail closed rather than write a partial payment.

## 3. Accounting rules used, and the evidence

| Question | Rule used | Evidence |
| --- | --- | --- |
| Authoritative status for one payment row | `payments.payment_status = completed` means that row is already settled and must not be billed again | `confirm-cash` rejects `completed` and `paid`. `applyStudentCreditToPayments` only allocates `pending`, `partial`, `processing`, and `open`. Bulk already skipped `due_rappen === 0` with the comment "already fully paid". The bug was that a completed row's due ignored `amount_paid_rappen` and became the full due. |
| Invoice header amount and status | `mark-invoice-paid` writes `paid_amount_rappen`, `payment_status`, and `status`. Header amount is `least(previous + requested, total)`. Partial keeps `status = sent` and does not clear dunning. | The handler formula and the tests that locked it. |
| Journal | `invoice_payments.amount_rappen` stores the requested amount, not the clamped remainder | The old insert used `newPayment`. `check_positive_amount` requires `amount_rappen > 0`. |
| `amount = 0` | `NULL` or `0` books the invoice total | The old `paid_amount_rappen \|\| invoice.total_amount_rappen`, plus the positive-amount check, which cannot store 0. |
| Failed journal | The header, journal, dedupe row, payment completion, and staff-POS credit commit together or not at all | This change. There was no existing transaction. |
| `mark-paid` ledger | Still does not write `paid_amount_rappen` or `invoice_payments`. Only `admin` updates the invoice status. | Existing handler and tenant test. |
| Repeated bulk `completed` | Remaining due is 0. The batch function also refuses to rewrite a completed row. | Due helper plus the SQL guard. |
| Overpayment | Unchanged. Header is clamped. Journal keeps the requested amount. Bulk excess above the selected dues still goes to student credit after the batch. | Old comments "Kumulativen Betrag auf Rechnungsbetrag deckeln" and "Overpayment = money paid beyond total due". |

## 4. Files and transaction design

- `migrations/20261016_payment_settlement_atomicity.sql`
- `server/api/invoices/mark-paid.post.ts`
- `server/api/invoices/mark-invoice-paid.post.ts`
- `server/api/staff/process-bulk-payment.post.ts`
- `server/utils/payment-settlement.ts`
- `server/utils/cash-settlement-due.ts`
- `server/utils/__tests__/payment-settlement-atomicity.pg.test.ts`
- `server/utils/__tests__/cash-settlement-due.test.ts`
- `server/utils/__tests__/invoice-payment-tenant-scope.http.test.ts`
- `server/utils/__tests__/staff-pos-completion.test.ts`
- `package.json` and `package-lock.json` for the disposable Postgres test dependency `@electric-sql/pglite`

Each function is `SECURITY DEFINER` with `search_path = pg_catalog, public`. `EXECUTE` is revoked from `PUBLIC`, `anon`, and `authenticated`, and granted to `service_role`. The function loads the actor by the database user id the authenticated handler already resolved. It does not trust a client `tenant_id`. RLS and table grants are not changed.

`staff_pos_sale` is called with dynamic SQL only after a full payment, and only for rows whose metadata source is `staff_product_sale`. A failure there aborts the function.

## 5. Tests

On `a9215f44`, with the untracked audit file moved out of the worktree:

- `npm test`: 3194 vitest tests passed, and `scripts/ci/validate-supabase-db-url.test.mjs` passed (17)
- `npm run lint`: passed

Disposable Postgres file `payment-settlement-atomicity.pg.test.ts` (10 tests): empty sibling predicate, pending sibling stays partial, invoice-update failure rolls the payment back, completed cash replay, foreign tenant, zero amount books the total, overpayment journal stays 15000 while the header stays 10000, journal failure rolls the header back, repeated manual call on a paid invoice does not add a journal, staff-POS failure rolls the invoice back, completed batch amount is not replaced, foreign invoice rolls the batch payment back.

The HTTP file is an in-memory mock. Its names say so. It checks that the handler calls one RPC and does not leave its own writes behind when that RPC fails or returns null. It is not proof of a database transaction.

## 6. Database versus mock

Transaction rollback was executed in disposable PGlite (in-process Postgres), not in production, staging, or Supabase. The HTTP tests are mocks.

## 7. Human decisions still required

1. Should an overpayment journal stay at the requested amount, be reduced to the invoice remainder, or also create a wallet credit? The code still stores the requested amount on the journal and the clamped amount on the header.
2. Should a second partial payment of the same amount, with no bank dedupe key, be rejected? It is still booked. Only a fully paid invoice, or a duplicate bank key, is idempotent.
3. Should a failed wallet credit, appointment confirmation, affiliate call, or bulk overpayment credit roll the settlement back? They remain outside the transaction, matching the previous non-fatal behavior.

## 8. Required checks

Not yet observed on the tip that contains this document. After push, read Test and lint, E2E login, and Dependency review on that exact SHA. `App | Default` is not a required ruleset check.

## 9. Production confirmation

No production or staging database was written. The migration was not applied. No invoice was marked paid. No Stripe charge, refund, or other live payment operation was sent. Nothing was deployed. PR #460 was not modified. The branch was not merged or undrafted, and it was not synchronized onto later `main`.
