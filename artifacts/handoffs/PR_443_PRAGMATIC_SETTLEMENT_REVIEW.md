# PR #443 pragmatic settlement review

Date: 2026-10-16

No application code was changed in this pass. The settlement behavior already matched the reduced scope.

## 1. Observed state

- Repository: `Kilchi555/driving-team-app`
- Pull request: https://github.com/Kilchi555/driving-team-app/pull/443
- Draft: yes
- Branch: `cursor/invoice-payment-tenant-scope-4274`
- Code head reviewed: `6a6871d4a6cb085d2c2b6a20983f59b6bd8fc8c0`
- GitHub base: `main` at `ecf9694ff5b6626539ad0230fee2ca1c3a3d6121`
- The branch was not rebased or synchronized onto later `main`.

Required checks read on `6a6871d4` before this file existed:

| Check | Result |
| --- | --- |
| Test and lint | SUCCESS |
| E2E login | SUCCESS |
| Dependency review | SUCCESS |
| App \| Default | FAILURE |
| App \| Default \| Archive - iOS | ACTION_REQUIRED |

`App | Default` is not a required ruleset check. This file is the only change after `6a6871d4`. Read the three required checks again on the commit that contains this file. Do not reuse the table above for that newer tip.

## 2. What this pass changed

No handler, SQL, test, or migration was edited.

The code already does the reduced scope:

- `settle_marked_invoice_payment` stores the requested receipt in `invoice_payments.amount_rappen` and in `bank_import_records.amount_rappen`. The invoice header stores `least(previous + requested, total)`. A CHF 100 receipt on a CHF 80 invoice stays 10000 rappen on the journal and the bank row, and 8000 rappen on the header. This function does not write `student_credits`.
- A repeated `camt_dedupe_key` raises `duplicate_bank_import` inside that function. Two manual partials of the same amount, with no bank key, both book. Nothing deduplicates by invoice id plus amount. No manual UI idempotency key was added. No concrete defect forced that expansion.
- A completed cash replay does not rewrite the payment amount. If the appointment is still `pending_confirmation`, the replay confirms it. That path is covered by the in-memory handler test.
- `applyInvoiceCreditOnPaid` inserts the `credit_transactions` row before it updates `student_credits`. Those two writes are not one transaction. A failed ledger insert leaves the balance unchanged. A later call that already sees the ledger row does not add the product credit again.
- The affiliate call is still the existing non-fatal `$fetch` to `/api/affiliate/process-reward`. It was not changed.
- Bulk cash surplus is still computed after the batch and written to `student_credits` with `reference_type: 'overpayment'`. It was not redesigned.

Known limitation, not a solved issue: the gap between the receipt and the capped header is not a wallet credit, a refund liability, or an unapplied-payment account. No table was added for it.

## 3. Tests

Run on the code at `6a6871d4`, before this document:

- `npx vitest run` of `payment-settlement-atomicity.pg.test.ts`, `invoice-credit.test.ts`, `invoice-payment-tenant-scope.http.test.ts`, `cash-settlement-due.test.ts`, `staff-pos-completion.test.ts`, and `staff-pos-bulk-split.test.ts`: 6 files, 119 tests, passed.
- `npm run lint`: passed.
- `npm test`, with the untracked pre-merge audit file moved out of the worktree: 281 files, 3200 tests, passed, and `scripts/ci/validate-supabase-db-url.test.mjs` passed (17). That audit file was not committed.

`payment-settlement-atomicity.pg.test.ts` executes the SQL functions in disposable PGlite. That is the transaction evidence. It is not a production schema and it is not a migration application.

`invoice-payment-tenant-scope.http.test.ts` and `invoice-credit.test.ts` use in-memory stand-ins. They are not proof of a database transaction.

`npx nuxi typecheck` was not run. `tsconfig.json` already has a trailing comma that breaks it, and that file was not edited.

## 4. Remaining risks

- Surplus. A receipt above the invoice remainder is stored in full on the journal and, when a bank key is present, on the bank-import row. The header stops at the amount due. The difference is not credited to the student wallet. Summing the journal will not match the header.
- Keyless repeat. Two equal manual installments both book. That is the existing legitimate behavior. A double submit of the same manual partial also books twice, because the dialog sends no separate identity.
- Product-wallet writes are two separate calls. If the ledger insert succeeds and the balance update then fails, the next call sees the ledger row and skips. The wallet can stay short. Two overlapping calls can both pass the "no ledger row yet" check and both credit. This is not atomic.
- Bulk cash surplus has no identity. After the selected payments are already completed, remaining due is 0, so the same tender can be deposited again. The affiliate retry path was left as it is.
- The migration `migrations/20261016_payment_settlement_atomicity.sql` is only in this branch. It has not been applied. PGlite success is not production compatibility.

## 5. What still blocks a future merge

No further code change is required inside this reduced scope. Nothing found here is an unstated tenant-crossing write or a partial settlement commit inside the three SQL functions.

A production release is still blocked until a person applies that migration before these handlers deploy. `main` deploys after a merge. If the handlers arrive first, the settlement calls return 500 because the functions do not exist. That fails closed. It does not leave a payment completed and the invoice pending. Staff also cannot settle through those endpoints until the functions exist.

The surplus gap, the keyless manual repeat, the non-atomic wallet pair, and the bulk-surplus retry are known limitations. They block any claim that wallet credits and bulk surplus are settled exactly once. They do not justify more tables, keys, or migrations in this pull request. The smallest later corrections, outside this PR, are: a unique product-credit ledger key after a human checks for existing duplicates, and a caller-supplied identity for the bulk surplus. Neither was started here.

## 6. Next action

Keep the pull request a draft. Read Test and lint, E2E login, and Dependency review on the commit that contains this file.

Do not merge, undraft, or apply the migration from this review. When a person later chooses to ship, apply `migrations/20261016_payment_settlement_atomicity.sql` in a reviewed session first, then deploy the handlers. Accept the four limitations in section 4, or schedule them as a separate change.

## 7. Prohibited actions

No production or staging write. No invoice was marked paid. No wallet balance was changed. No Stripe, Wallee, refund, or other live payment call. No workflow dispatch. No merge, approval, or undraft. No sync with `main`. PR #460 was not modified. The migration was not applied.
