# PR #455 — Migration compatibility and merge readiness

Observed: `2026-10-17T06:32:00Z`

Verdict: **PASS — SAFE FOR HUMAN MERGE REVIEW**

The draft pull request is up to date with `main`. The two named review threads are resolved because the current code and tests cover them. Required GitHub checks passed on the implementation commit below. No shared or production data was modified, and the migration was not applied there.

This report commit does not change the migration or the function. Re-read the required checks on the pull request head before a person merges. App Store checks are not part of the merge ruleset.

## 1. State

| Item | Value |
| --- | --- |
| PR | https://github.com/Kilchi555/driving-team-app/pull/455 |
| State | Open, draft. Not merged, not undrafted. |
| Implementation commit | `6cf617b3c1f864979cdf615e16f16630077fa3ad` |
| `origin/main` | `a9a9745123e124d51ad5fa13a84523055c3a90ef` |
| Up to date with `main` | Yes. `origin/main` is an ancestor. The earlier gap was #461 only. |
| Integration | Merge commit `f12178b85748d9b06f318abb3e86a2296371d542`. No force-push. No conflict. `package.json` kept both `pg` and `@electric-sql/pglite`. |

#461 adds a same-tenant check before storing `company_id` on an invoice. It does not edit the receipt-reset function.

## 2. Review threads

Both threads were still open and not outdated at the start of this gate. The code on the branch already addressed them, and the tests below cover that behavior. They are now resolved on GitHub.

| Thread | Comment | Current code | Thread |
| --- | --- | --- | --- |
| `components/admin/PaymentReceiptResetDialog.vue` — blocked submit hides the form | `4294802741` | The form stays mounted when a preview exists (`v-else-if="loadError && !preview"` then `v-else-if="preview"`). A failed submit writes the error inside that form. | Resolved |
| `server/utils/payment-receipt-reset.ts` — replay skips dispositions | `4294802755` | The planner returns `alreadyApplied` before disposition checks. The SQL function recognizes an existing reversal before those checks. A new key with null dispositions returns `already_applied` and does not insert another reversal. | Resolved |

## 3. CI

Local, on a clean tree, before the implementation commit:

| Command | Result |
| --- | --- |
| `npm test` with `RECEIPT_RESET_TEST_DATABASE_URL` pointed at local disposable Postgres | 284 files, 3241 tests passed. The following node test file passed 17. |
| `npm run lint` | Passed, max warnings 0. |
| Pre-push `npm run smoke-test` (`nuxt build` and `/api/health`) | Passed. The server booted and returned status ok. |

There is no separate typecheck script in the required CI job. `nuxt build` ran in the pre-push smoke test.

GitHub, exact head `6cf617b3c1f864979cdf615e16f16630077fa3ad`:

| Required check | Result |
| --- | --- |
| Test and lint | Success. Run `39010095634`. |
| E2E login | Success. Same run. |
| Dependency review | Success. Run `39010095637`. |

CodeQL was still pending when the required checks finished and is not a ruleset check. App Store status is not a merge gate.

## 4. Schema fidelity

Shared test project ref: `kssqalisscxkhvorqwgy` (Postgres 17.6). Production ref `unyjaetebnaexaflpyoc` was not queried. Restore project `kvazmjcizgvfaozxizss` was not queried.

No database URL was available for `pg_dump`. A full 236-table schema was not restored, and no rows were copied.

The disposable database is local Postgres 16, database `simy_receipt_reset`. The fixture now includes the objects the migration writes and the triggers that run on those writes:

- Invoice status trigger and appointment-paid trigger.
- `book_payment_to_accounting`, matching the live body that returns before booking when the new status is not `completed` or `paid`.
- `calculate_invoice_vat` on invoice insert and update. All 16 invoices on the shared project match that formula (0 null VAT rates, 0 mismatches), so a reset update would not change their totals.
- `log_payment_changes` into `payment_audit_logs`.
- `prevent_client_payment_mutation`, which raises only for `anon` or `authenticated` when the JWT user is a client.
- `create_cash_transaction_from_payment`, which inserts cash only for method `cash` and status `completed`.
- `release_checkout_benefits_on_payment_close`, which returns before any other call when the new status is `invoice`.
- Check constraints for invoice status, invoice payment status, and accounting entries.
- `credit_transactions.status varchar` default `completed`, with no check constraint.
- `student_credits.balance_rappen`.
- `auth.uid()` stub.

The migration was applied twice on that database during test setup. The second apply succeeded.

Not restored, and therefore not executed:

- Appointment occupancy trigger `enforce_appointment_staff_occupancy`. A status-only update is ignored unless the row newly occupies staff. `set_status` can reach `BOOKING_CONFLICT`. `leave_unchanged` does not update the appointment. A conflict would abort the whole reset transaction.
- Invoice insert-only triggers (number, due date, populate items).
- Cash-balance triggers.
- Foreign keys to tenants, companies, products, and the rest of the 236-table graph.
- Row-level policies. RLS is enabled on the live financial tables and not forced. Table owner `postgres` has `BYPASSRLS`. The function is security definer.

## 5. Test matrix

Disposable database only. Synthetic ids. The function was not called on the shared project.

| Case | Expected | Actual |
| --- | --- | --- |
| Admin reset of a synthetic shared invoice | One reversal, payment `invoice`, siblings unchanged | Pass |
| Tenant-admin authorization | Planner allows `tenant_admin` | Pass |
| Staff and client | Planner rejects both. SQL rejects staff with `forbidden` | Pass |
| Cross-tenant payment or actor | `payment_not_found` or `forbidden`. Ledger unchanged | Pass |
| Cash, Wallee, refund, bank import | `actual_receipt_channel` or `bank_settlement_present`. No reversal | Pass |
| Same-key replay | Stored result, no second reversal | Pass |
| New key after a clean reset, null dispositions | `already_applied`, still one reversal and one storno | Pass |
| Same key on a different payment | `idempotency_payment_mismatch`. No new write | Pass |
| Concurrent reset and an existing manual storno | One reversal and one live storno | Pass |
| Forced audit-insert failure | Full rollback | Pass |
| Wallet stamp, invoice deposit, Staff-POS, linked credit | Rejected. Ledger snapshot unchanged | Pass |
| Cancelled credit status | Still `invoice_credit_transaction_present`. The column has no reversed flag | Pass |
| New key after a reset when a credit row was added | Does not return `already_applied`. No extra audit or reversal | Pass |
| Storno of the same income id owned by another tenant | `storno_conflict`. Payment stays `completed`. Foreign row unchanged | Pass |
| Execute grants | `public`, `anon`, and `authenticated` false. `service_role` true. `SECURITY DEFINER`. `search_path=pg_catalog, public` | Pass |
| Second apply of the migration file | Succeeds | Pass |
| Dialog source | Form remains when a preview exists | Pass |

Receipt-reset files: 14 planner/source tests and 21 database tests, all passed, included in the 3241.

## 6. Findings

| Severity | Finding |
| --- | --- |
| Fixed | A unique-violation handler could select another tenant's live storno of the same income id and return it as this reset's storno. It now selects only the caller's tenant and raises `storno_conflict` otherwise. The transaction rolls back. |
| Fixed | A new idempotency key could return `already_applied` while a credit stamp or credit row was still present. Credit checks now run before that audit insert. A same-key replay still returns the stored payload and does not re-check credit. |
| Low | `student_credits.balance_rappen` is not scanned. A balance is not tied to one invoice. The linked credit row and `credit_applied_rappen` are what the function rejects. |
| Low | `credit_transactions.status` accepts any varchar. Comments name `pending`, `completed`, `failed`, `cancelled`, `withdrawal_pending`, and `withdrawal_completed`. A cancelled row still blocks. That is fail-closed. |
| Low | `set_status` was not executed under the live occupancy trigger. A booking conflict aborts the transaction rather than writing a partial reset. |
| Low | The disposable database is Postgres 16. The shared project is 17.6. The migration applied on 16. |

No Critical or High finding remains.

## 7. Files changed

| File | Why |
| --- | --- |
| `migrations/20261016_admin_reset_mistaken_receipt.sql` | Credit checks precede `already_applied`. Storno reuse is limited to the same tenant. |
| `server/utils/payment-receipt-reset.ts` | The planner blocks an applied reset when credit remains, so the HTTP layer does not call the function. |
| `server/utils/__tests__/fixtures/receipt-reset-schema.sql` | Adds the live triggers and credit/audit tables the reset update actually runs. |
| `server/utils/__tests__/payment-receipt-reset.db.test.ts` | Regression tests for credit-after-reset, a cancelled credit status, a foreign storno, grants, and a second migration apply. |
| `server/utils/__tests__/payment-receipt-reset.test.ts` | Planner and SQL-order coverage for the same rules. |
| Merge from `main` | #461 company-link files only. No manual conflict resolution. |

## 8. Data statement

No shared database was modified. The shared test project received read-only catalog and aggregate queries only. Production was not connected. The migration ran only on local disposable Postgres with synthetic fixtures. The reset function was not executed against a shared environment.

## 9. Next action

A person can review and merge the draft when the required checks on the final head are green. Do not apply the migration to the shared test project or to production as part of that merge. Do not undraft this pull request from this gate.
