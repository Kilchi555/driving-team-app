# PR #443 settlement integrity hardening

Date: 2026-10-17

This change is a new draft pull request based on PR #443. PR #443 was not merged, undrafted, or edited. No production or staging database was written. No migration was applied. No invoice, payment, wallet balance, or ledger row was changed. No payment provider was called.

## 1. Overpayment

Finding: `settle_marked_invoice_payment` still stores the full receipt on `invoice_payments` and caps `invoices.paid_amount_rappen` at the invoice total. There is no unapplied-payment column, no liability account, and no allocation table for the difference. `student_credits` is a different store: product lines flagged `credit_to_wallet`, and a separate cash surplus. Using it for an invoice surplus would count the same money twice, once on the journal and once as wallet credit. The repository does not say which of those the surplus should be.

Decision, not implemented: do not add a table or column, and do not credit the surplus automatically. A later additive column would be required only after a person chooses one treatment: leave the journal-versus-header gap, record an explicit unapplied amount, or credit the wallet. This pull request does not make that choice.

The header still cannot grow past the amount due. A disposable Postgres test locks a CHF 100 receipt on a CHF 80 invoice: header 8000, journal 10000, no `student_credits` row.

## 2. Manual idempotency

Finding: a bank import already has `(tenant_id, dedupe_key)`. A manual call without a key has no action identity. Amount plus invoice id is not a safe key, because two equal installments are legitimate.

Implemented: optional `idempotency_key` on `invoice_payments`, unique per tenant when present. `settle_marked_invoice_payment_idempotent` calls the existing settlement function and stamps that key in the same transaction. The same key returns the existing booking. A different amount for the same key raises `idempotency_amount_mismatch` and does not add a journal. Two different keys of the same amount both book. A missing key still books. The mark-paid dialog keeps one UUID for that dialog and sends it again on retry. A new dialog is a new action.

Parallel sessions were not opened. The unique index is the race guard: the losing transaction rolls its settlement back and returns the committed booking.

## 3. Wallet ledger and balance

Finding: `applyInvoiceCreditOnPaid` used separate REST writes. A failed balance update could leave a ledger row, or the reverse.

Implemented: `apply_invoice_product_credit` inserts the ledger row, calls `increment_balance`, and stamps `invoices.credit_applied_rappen` in one function. A ledger or balance failure rolls all three back. A second call does not increment again. The invoice settlement itself stays a separate transaction, as it was. A wallet failure still does not undo a committed invoice payment. Tenant and role checks stay inside the function. Execute is granted only to `service_role`.

The unit test's `rpc()` is a mock. It is not transaction proof. The rollback was executed in disposable PGlite.

## 4. Cash surplus

Finding: the bulk cash surplus had no action id. After the payments were completed, a retry treated the whole tender as a new surplus. The deferred staff-POS function is a different key and is not called from this path.

Implemented: `apply_identified_cash_overpayment` stores `bulk-cash-overpay:<action id>` and deposits the surplus in one function. The same key returns the stored amount and does not deposit again, even if a later call sends a different amount. A second key is a second deposit. The cash dialog creates one UUID when it opens and sends that key with the surplus it calculated. A caller that omits the key still uses the old non-idempotent insert. That path cannot be closed without either an action id or a key made from payment ids, which would reject a later genuine surplus.

## Files

- `migrations/20261017_settlement_integrity_hardening.sql`
- `server/api/invoices/mark-invoice-paid.post.ts`
- `server/api/staff/process-bulk-payment.post.ts`
- `server/utils/invoice-credit.ts`
- `server/utils/payment-settlement.ts`
- `components/admin/InvoiceDetailModal.vue`
- `components/EnhancedStudentModal.vue`
- `server/utils/__tests__/settlement-integrity-hardening.pg.test.ts`
- `server/utils/__tests__/invoice-credit.test.ts`
- `server/utils/__tests__/invoice-payment-tenant-scope.http.test.ts`

## Migration order

Apply `migrations/20261016_payment_settlement_atomicity.sql` first, then this file. Both are additive. This file does not rewrite existing rows. If duplicate invoice-deposit ledger rows already exist, index creation stops with `invoice_deposit_duplicates_exist` and changes nothing.

Deploy the handlers only after both functions exist. If the handlers are deployed first, the new RPC names are missing and those calls return an error. The previous 12-argument settlement function is left in place.

This migration was executed only in disposable PGlite. That is not production compatibility.

## Tests

Disposable Postgres, `settlement-integrity-hardening.pg.test.ts`: 6 passed. Grants, partial and full payment, overpayment without a wallet row, keyed retry, two equal partials, amount mismatch, wallet rollback, wallet replay, cash replay, a second cash action, and a foreign-tenant refusal.

Related Vitest files: invoice credit, tenant-scope HTTP mock, previous settlement Postgres tests, cash due, staff-POS completion, deferred overpayment, and bulk split. 136 tests passed across those files including the new ones. The HTTP file is a mock.

`npm run lint` passed.

`npm test` on `f9f2287d`, with two untracked audit notes moved out of the worktree: 282 files, 3206 tests passed, and `scripts/ci/validate-supabase-db-url.test.mjs` passed (17). Those audit notes were not committed. An earlier run failed only the clean-tree schema check while these files were still unstaged.

## Remaining risks

- The invoice surplus still has no dedicated account.
- A manual or cash request without an action key can still book twice.
- The product-credit wallet transaction does not include the invoice settlement. A failed wallet call leaves the invoice paid.
- Two database sessions at once were not opened. The unique indexes are the concurrency control.
- `main` moved to `a9a9745123e124d51ad5fa13a84523055c3a90ef` after PR #443's recorded base. This branch was not synchronized.

## Human approval

Choose the invoice-surplus treatment before any schema for it is added. Review this draft only after PR #443. Do not apply either migration to production or shared staging from this review. Do not merge or undraft either pull request.
