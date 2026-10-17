# PR #455 — Staging migration compatibility test

Observed: `2026-10-17T06:02:39Z`

Verdict: **CONDITIONAL PASS**

The migration file is compatible with the current shared test schema on the facts checked below. It was not applied to that project. Functional execution used a local disposable database and synthetic rows only.

## Pull request

| Item | Value |
| --- | --- |
| PR | https://github.com/Kilchi555/driving-team-app/pull/455 |
| State | Open, draft |
| Head | `af08ab0f58689828367c570ecbe5f845854e57a6` on `cursor/admin-payment-reset-59ff` |
| Base recorded on the PR | `ecf9694ff5b6626539ad0230fee2ca1c3a3d6121` (`main` at the previous review) |
| `origin/main` at this observation | `a9a9745123e124d51ad5fa13a84523055c3a90ef` |
| Merge state | `MERGEABLE`, `mergeStateStatus: BEHIND` |

Head is unchanged from the function-only review (`af08ab0f`). `main` has moved by one commit: `a9a97451` `fix(invoices): store company_id only after a same-tenant check (#461)`. This gate did not merge that commit.

Migration file: `migrations/20261016_admin_reset_mistaken_receipt.sql`

## Environment identity

| Project | Ref | Role in this gate |
| --- | --- | --- |
| Shared test project | `kssqalisscxkhvorqwgy` | Read-only preflight. Region `eu-west-1`, Postgres `17.6`, database name `postgres`, status active. |
| Production | `unyjaetebnaexaflpyoc` | Identified and not queried. Not written. |
| Restore project | `kvazmjcizgvfaozxizss` | Listed only. Not queried. Not written. |

The test ref and the production ref are different projects. Production was excluded before any SQL ran.

The shared test project is not disposable. It holds shared rows: 22 payments, 16 invoices, 3 invoice-payment rows, 29 accounting entries, 0 journal lines, 43 appointments, 0 credit transactions, 5 cash transactions, 0 bank-import rows, 57 users, 12 invoice items. No row contents were copied out.

No database URL for that project was available for `pg_dump`. A full schema restore (236 public tables, 198 public functions) was not created. The isolated database used below is local Postgres 16, database `simy_receipt_reset`, loaded from the repository fixture plus this migration. It does not contain a copy of the shared test schema or any remote rows.

## Preflight result

Read-only. Statements were `SELECT` catalog and aggregate queries, plus the migration list. No `INSERT`, `UPDATE`, `DELETE`, `DDL`, or `apply_migration`.

| Check | Result |
| --- | --- |
| `admin_reset_mistaken_receipt` | Absent (0 signatures) |
| `payment_receipt_resets` | Absent |
| Migration history | No version or name for this reset. Latest listed migration is `20261014161558` `tenant_registration_abuse_protection_20261014`. |
| `gen_random_uuid()` | Present |
| Roles `anon`, `authenticated`, `service_role`, `postgres` | Present |
| Referenced columns | Present, including `invoices.credit_applied_rappen`, `payments.credit_transaction_id`, `payments.wallee_transaction_id`, `users.is_active`, `users.deleted_at`, `bank_import_records.invoice_id` |
| Extra `NOT NULL` columns without defaults on the three insert targets | None outside the function's column lists |
| `credit_transactions.status` | Column exists. 0 rows, so 0 distinct statuses. The function does not filter it. |
| RLS enabled on the financial tables the function touches | Yes. `FORCE ROW LEVEL SECURITY` is off. |
| Table owner | `postgres`, which has `BYPASSRLS` and is not superuser |
| `service_role` | `BYPASSRLS`, not superuser |
| Event triggers | Six Supabase platform triggers. `pgrst_ddl_watch` / `pgrst_drop_watch` reload the API on DDL. The others are limited to extension create/drop. None is a custom block on this function. |

`bank_import_records` has no `payment_id` column. The function matches `invoice_id` and `tenant_id`, and both columns exist.

## Unique-index conflicts

| Index | Present now | Conflicting rows |
| --- | --- | --- |
| `accounting_entries_one_live_storno` on `storno_of_id` where `deleted_at` is null | No | 0 duplicate groups. 0 live storno rows. |
| `invoice_payments_reversal_once` on `(tenant_id, payment_reference)` where `status = 'reversal'` | No | 0 reversal rows. |

Creating either index on the current shared test data would not fail for duplicates.

`invoice_payments.check_payment_status` currently allows `pending`, `completed`, `failed`, `refunded`. The migration replaces it with the same list plus `reversal`. All 3 existing invoice-payment rows are `completed`, so the replacement check accepts them. `check_positive_amount` remains `amount_rappen > 0`. The reversal insert uses a positive amount.

## Schema compatibility

The function's writes match the live check constraints:

- Accounting amount must be `> 0`. Approval status includes `approved`. Source includes `system`. Type is `income` or `expense`. `document_kind` may be null. All 29 current entries have null `document_kind`, type `income`, source `manual`.
- Journal lines require one side positive. The function swaps the original debit and credit.
- Invoice `status` values written by the function (`sent`, `paid`, `overdue`) are allowed. Invoice `payment_status` values (`pending`, `partial`, `paid`, `overdue`) are allowed.
- `invoice_payments.payment_method` is `varchar`, not an enum, and has no check constraint. The value `reversal` is not rejected by a type or check.
- `payments.payment_status` has no check constraint. The function sets `invoice`. Current statuses on the shared project are `paid` (4), `open` (1), `completed` (4), `pending` (12), `invoiced` (1). `invoiced` is a different string from `invoice`. No null `tenant_id` on payments or invoice payments.
- No conflicting function signature exists, because the function is absent.
- `REVOKE` / `GRANT` targets exist.

Live triggers on the tables the function updates, which the disposable fixture does not install:

| Table | Trigger | Function | Notes for this reset |
| --- | --- | --- | --- |
| `payments` | `payments_book_accounting` | `book_payment_to_accounting` | Security definer. Body mentions `payment_status` and returns before booking when the new status is not completed. `pg_get_functiondef` md5 `9f63dd1acff0271bc914e4fa72a6d500`, unchanged from the 2026-10-16 fixture reading. |
| `payments` | `trg_prevent_client_payment_mutation` | `prevent_client_payment_mutation` | Invoker. Raises only when `current_setting('role')` is `authenticated` or `anon` and the JWT user is a `client`. The function is not granted to those roles. |
| `payments` | `trigger_create_cash_transaction` | `create_cash_transaction_from_payment` | Inserts cash only when method is `cash` and status is `completed`. The reset refuses cash before the update and then sets status `invoice`. |
| `payments` | `trg_release_checkout_benefits` | `release_checkout_benefits_on_payment_close` | No `RAISE EXCEPTION` literal. Not executed in this gate. |
| `payments` | `trigger_log_payment_changes` | `log_payment_changes` | No `RAISE EXCEPTION` literal. Not executed in this gate. |
| `invoices` | `trigger_update_invoice_status` | `update_invoice_status` | Before update. Uses `CURRENT_DATE`. md5 `a087bd170ffa2ce9786bc8ef905f544a`. The fixture includes this function. |
| `invoices` | `trigger_update_appointment_status_on_invoice_paid` | `update_appointment_status_on_invoice_paid` | Sets appointments paid only when the invoice becomes paid. md5 `e9fafa30c00b789c7a94cde2caaec284`. The fixture includes this function. |
| `invoices` | VAT, invoice number, due date, populate items | matching functions | Insert-only or VAT math. The reset updates an existing invoice. Not executed here. |
| `appointments` | occupancy and `updated_at` | matching functions | Fire if a disposition updates an appointment. Not executed on the live bodies. |

`get_payments_monthly_summary` md5 is `811a9f06e52a7078687b37cf0995521a`. It still sums `payment_status = 'completed'`.

## Migration status

| Database | Before | After this gate |
| --- | --- | --- |
| Shared test project `kssqalisscxkhvorqwgy` | Not applied | Not applied |
| Production `unyjaetebnaexaflpyoc` | Not queried | Not queried |
| Local disposable `simy_receipt_reset` | Fixture schema, then the migration, inside the test setup | Migration applied. A second apply of the same file exited 0. |

The second apply skipped the existing audit table, the extra audit columns, and both unique indexes, dropped and recreated the 12-argument function, and re-granted execute. The older 10-argument signature was already absent.

## Tests

Local disposable Postgres 16 only. Synthetic tenant, user, invoice, payment, and accounting ids. No remote payment id was passed to the function.

Vitest at `2026-10-17T06:01:04Z`:

| File | Result |
| --- | --- |
| `server/utils/__tests__/payment-receipt-reset.test.ts` | 13 passed |
| `server/utils/__tests__/payment-receipt-reset.db.test.ts` | 17 passed |
| Total | **30 passed, 0 failed** |

| Required case | Where it ran | Result |
| --- | --- | --- |
| Admin call | SQL success path uses a synthetic admin | Pass |
| Tenant-admin authorization | Planner allows `tenant_admin`. SQL success path was not repeated as `tenant_admin`. | Planner pass. SQL success not separately counted. |
| Staff and client rejection | Planner rejects both. SQL rejects a synthetic staff actor with `forbidden`. | Pass |
| Cross-tenant payment | SQL: other tenant actor `forbidden`; other tenant payment `payment_not_found`. Ledger unchanged. | Pass |
| Successful synthetic reset | SQL: one positive reversal, payment left as `invoice` | Pass |
| Shared invoice | SQL: only the 18600 line of a 46500 invoice reverses | Pass |
| Cash, Wallee, refund, bank-import | SQL rejects those stored facts and writes no reversal | Pass |
| Idempotent replay and mismatched key | SQL: same key replays; a new key does not double-apply; a key reused on another payment raises `idempotency_payment_mismatch` and writes nothing new | Pass |
| Concurrent reset and duplicate storno | SQL: two sessions and a manual storno end as one reversal and one live storno | Pass |
| Forced audit-insert failure | SQL: forced trigger raises and the payment, invoice, reversal, and storno stay unchanged | Pass |
| Wallet, invoice credit, Staff-POS, linked credit | SQL rejects each and compares the ledger snapshot | Pass |
| Grants and execute | SQL: `authenticated` lacks `EXECUTE`. Follow-up on the same local database: `public`, `anon`, and `authenticated` lack `EXECUTE`; `service_role` has it. Audit RLS enabled, not forced, 0 policies on the shared project because the table is absent there. | Pass |
| Repeat apply | Second `psql -f` of the migration on the local database | Pass (exit 0) |

These SQL tests load `server/utils/__tests__/fixtures/receipt-reset-schema.sql`. That fixture is not the 236-table shared schema. It does include the invoice-status, appointment-paid, and payment-booking functions copied for this feature. It does not include the cash, client-mutation, checkout-benefit, or payment-log triggers.

## Known limitations

- No schema-only dump of `kssqalisscxkhvorqwgy` was loaded. Live trigger bodies other than the fixture copies were inspected, not executed.
- `credit_transactions.status` exists on the shared project and is ignored. With 0 credit rows this does not change current results. A later non-live status would still block a reset.
- The branch is behind `main` by #461. That invoice change was not applied or tested here.
- Local Postgres is 16. The shared project is 17.6. The migration SQL uses no version-specific syntax that failed on 16.
- `student_credits.balance_rappen` is not scanned. The migration header already says so.
- A pre-existing cross-tenant storno of the same income id would be adopted by the unique-violation handler. No live storno exists today.
- This gate did not call the function on any shared or production payment.

## Shared database statement

No shared database was modified. The shared test project received read-only queries only. Production was not connected. The restore project was not connected. The migration ran only on local disposable Postgres `simy_receipt_reset` with synthetic fixtures.

## Safest next action

Leave the draft pull request unmerged. Do not apply `migrations/20261016_admin_reset_mistaken_receipt.sql` to `kssqalisscxkhvorqwgy` or to production until a person explicitly approves that step.

Before any shared apply, restore a schema-only copy of `kssqalisscxkhvorqwgy` into a new disposable database, apply the migration there, and rerun the synthetic suite. Do not copy payment or customer rows into that database.
