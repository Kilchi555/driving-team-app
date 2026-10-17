# PR 455 — Accounting blocker remediation

Draft only. This change does not authorize a merge, a production or staging migration, or a correction of any live receipt.

## Implementation gate

The user explicitly requested this draft remediation. Production SQL, staging SQL, and the live CHF 186 receipt stay unauthorized. The change stays fail closed: it blocks a reset it cannot reverse, and it does not add a partial credit reversal.

## Heads and pull request

Observed on 2026-10-16, before this remediation:

| Ref | SHA / state |
| --- | --- |
| Starting branch head | `335273b965fbeef68841a03811e414936df1ca22` |
| `origin/main` | `ecf9694ff5b6626539ad0230fee2ca1c3a3d6121` |
| Merge base with `origin/main` | `e1248c0b7fc5a08a439e9c3e1c15a3ce175a1a2e` |
| GitHub PR base | `e1248c0b7fc5a08a439e9c3e1c15a3ce175a1a2e` |
| PR 455 | OPEN, draft, `MERGEABLE`, `mergeStateStatus` `BEHIND` |
| Remediation code | `66177ac2322ae42fca5c03036ff65523da943ac3` |
| Handoff, verified clean tree | `126f244c7afde433092094076e15473845d40912` |

`126f244c7afde433092094076e15473845d40912` is the commit directly after the remediation code. Its parent is `66177ac2322ae42fca5c03036ff65523da943ac3`. The docs stamp after it changes only this document. The branch was not synchronized with `main`.

`origin/main` is one commit ahead: `ecf9694f` (`#457`, legal pages only). This branch does not contain it. Strict required-status checks on `main` will not merge a behind branch. That is a process gate, not a defect in this fix. This task did not merge `main`.

## Blockers

### 1. High — wallet and Staff-POS credit

`mark-invoice-paid` can grant credit when an invoice becomes fully paid.

- Wallet: `applyInvoiceCreditOnPaid` inserts `credit_transactions` with `transaction_type = 'deposit'`, `reference_type = 'invoice'`, `reference_id = invoice id`, then stamps `invoices.credit_applied_rappen`. The stamp can fail after the insert, so a transaction can exist while the stamp is still 0.
- Staff-POS: `applyStaffPosCreditsForPaidInvoice` calls `staff_pos_sale` action `apply_credit`. The current body inserts `transaction_type = 'credit_product_purchase'`, `reference_type = 'payment'`, `reference_id = payment id`. The credit row can belong to any staff-product payment on the invoice, including a sibling.
- Spending: `payments.credit_transaction_id` points at wallet credit spent on that payment (`extend_payments_with_credit.sql`). The reset does not restore that wallet.

The repository `credit_transactions` table has no status or reversed flag (`database_migration_student_credits.sql`, plus `tenant_id` and `description`). Any matching row is treated as live. Rows with `tenant_id` null are included so a missing tenant does not hide the credit.

`admin_reset_mistaken_receipt` now raises, before any payment, invoice, settlement, or accounting write:

| Fact | Exception |
| --- | --- |
| `invoices.credit_applied_rappen > 0` | `wallet_credit_present` |
| invoice `deposit` or `credit_product_purchase` row | `invoice_credit_transaction_present` |
| `credit_product_purchase` + `reference_type = 'payment'` for any payment on this invoice and tenant | `staff_pos_credit_present` |
| target `payments.credit_transaction_id` is not null | `linked_credit_transaction_present` |

The planner and loader use the same facts (`creditAppliedRappen`, invoice-credit count, Staff-POS count, `credit_transaction_id`). A failed credit read sets `credit_lookup_failed` and blocks the plan. SQL remains the authority. No credit, wallet balance, or stamp is updated.

### 2. Medium — keep the blocked-submit form

`PaymentReceiptResetDialog.vue` used `v-else-if="loadError"`, which replaced the form after a rejected submit. The form now stays mounted when a preview exists. The reason and disposition fields stay bound. The specific code is mapped to a German message (`wallet_credit_present`, `staff_pos_credit_present`, `idempotency_payment_mismatch`, and the other reset codes). A load failure with no preview still shows the error alone. Hard credit, channel, and key-mismatch stops disable submit. The user can still close.

### 3. Medium — already applied

The reversal lookup now runs after the payment, invoice, and sibling locks and before sibling confirmation, line disposition, and appointment disposition. A repeated call with a new idempotency key, `confirm_siblings = false`, and null dispositions returns `already_applied`. It inserts one audit row and does not insert a second reversal or storno.

The planner already returned `alreadyApplied` without requiring dispositions. The HTTP layer still calls the function for that plan, including null dispositions, so the database re-checks under locks. The dialog hides the disposition controls when `already_applied` is true.

A same-key replay still returns the stored payload earlier and does not write again.

### 4. Medium — idempotency key binding

A stored `payment_receipt_resets` row is reused only when `tenant_id` and `payment_id` both match. The same key for a different payment in the tenant raises `idempotency_payment_mismatch` after the advisory lock and before any insert or financial update.

## Tests

Disposable Postgres 16, database `simy_receipt_reset`, URL from `RECEIPT_RESET_TEST_DATABASE_URL`. The tests apply the migration only to that local database. No remote Supabase call was made.

Targeted Vitest, 2026-10-16:

`npx vitest run server/utils/__tests__/payment-receipt-reset.test.ts server/utils/__tests__/payment-receipt-reset.db.test.ts`

30 passed (13 planner/SQL/dialog, 17 disposable Postgres).

New disposable Postgres cases, all passed:

- `credit_applied_rappen = 5000` and no credit row → `wallet_credit_present`
- `deposit` / `reference_type = 'invoice'` with a null tenant and stamp 0 → `invoice_credit_transaction_present`
- `credit_product_purchase` / `reference_type = 'payment'` on the target payment → `staff_pos_credit_present`
- the same Staff-POS shape on the sibling payment, null tenant → `staff_pos_credit_present`
- `payments.credit_transaction_id` set → `linked_credit_transaction_present`
- after a successful reset, a new key with null dispositions and `confirm_siblings = false` → `already_applied`, reversals 1, stornos 1, audits 2
- same key against the sibling payment → `idempotency_payment_mismatch`

`npm run lint` (eslint on `server/utils/__tests__/**/*.ts`, max warnings 0): exit 0.

eslint on `payment-receipt-reset.ts`, `payment-receipt-reset-load.ts`, and `payment-receipt-reset-http.ts`: exit 0.

`node --test scripts/ci/validate-supabase-db-url.test.mjs`: 17 passed.

Full `npm test` before the commits: Vitest 3188 passed, 1 failed. The failure was `course-invoice-phase1-schema.test.ts` test 29, which requires a clean `git status`. The dirty paths were the files in this remediation.

On the clean tree at `126f244c7afde433092094076e15473845d40912`, that test passed (`npx vitest run server/utils/__tests__/course-invoice-phase1-schema.test.ts -t "29. appointment automation"`: 1 passed, 35 skipped).

## No partial writes

Each credit rejection is asserted in autocommit. The test snapshots payments, invoices, invoice payments, accounting entries, journal-line count, credit transactions, and audit count, calls the function, and requires the snapshot to be identical after the exception. A write that committed before the exception would show up. The function has no internal `COMMIT`.

Observed after those rejections:

- the target payment stays `completed` with `paid_at` set
- the invoice stays `paid` at 46500 rappen
- the wallet stamp or credit row is still present at the inserted amount
- reversal count, storno count, and new audit count stay 0
- the Staff-POS sibling payment stays `completed`

The idempotency mismatch uses the same snapshot after a successful first reset. The sibling stays `completed`. The stored audit, reversal, and storno are unchanged.

The already-applied replay adds one `payment_receipt_resets` audit row (`result = already_applied`) and leaves the reversal count at 1 and the storno count at 1.

## Diff check

- Credit checks and `idempotency_payment_mismatch` happen before `UPDATE public.payments`.
- The function does not insert, update, or delete `credit_transactions` or `student_credits`, and it does not change `credit_applied_rappen`.
- Invoice update still sets paid amount, status, and `paid_at` only, and only after the credit checks pass.
- `EXECUTE` remains `service_role` only. Audit table grants remain `SELECT, INSERT` for `service_role`.
- Tenant checks on the actor, payment, invoice, siblings, and credit predicates are unchanged or stricter.
- Sibling payments are still locked and not updated.

## Remaining limitations

- `student_credits.balance_rappen` is not scanned. A balance is not tied to one invoice. A balance change with none of the four facts above is not detected. The reset does not guess and does not reverse part of a wallet.
- A reset that was applied before this check can still replay as `already_applied`. Replay does not remove credit that was left behind. This change does not repair that history.
- `credit_transactions` has no status column here. A future reversed or voided row with the same reference would still block the reset.
- A short reason still raises `missing_reason` before the idempotency payment comparison. The dialog requires 10 characters. The HTTP fallback `Bereits korrigiert` is used only when the planner is not blocked.
- The loader's cash query is still tenant-scoped, while SQL blocks any cash row on the appointment, including a null tenant. SQL stays fail closed.
- The branch is behind `origin/main` (`ecf9694f`). It was not updated.
- App Store checks are not merge gates. Required ruleset checks remain Test and lint, E2E login, and Dependency review. They will run again on this head after push. This handoff does not claim those remote checks.
- The migration was not applied to production or staging. No live receipt was corrected. The pull request stays draft. Nobody merged, approved, undrafted, deployed, or dispatched a workflow in this task.
