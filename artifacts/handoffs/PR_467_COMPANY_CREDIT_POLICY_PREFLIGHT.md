# PR #467 company-credit policy and read-only preflight

Documentation only. The credit feature is not implemented.

Observed 2026-10-17. PR #467: https://github.com/Kilchi555/driving-team-app/pull/467

- Remote branch before this commit: `cursor/settlement-integrity-hardening-4274`
- Remote head before this commit: `9d4d60ccafa96ecb7878e6c9a65008b8a52e1340`
- Base: `1991c4398950cdeb0b0dc0730ae3bceb52c8864d`
- State before this commit: OPEN, Draft

The design document that this commit updates was previously only on draft PR #471 (`8c5a6949`). This commit places the updated design, the preflight SQL, and this handoff on the #467 branch. PR #471 is left as it was.

## 1. Product decisions added

Recorded in `artifacts/handoffs/PR_467_OVERPAYMENT_CORPORATE_CREDIT_DESIGN.md` under “Agreed product policy (added 2026-10-17)” and in section 9.

- Company credit belongs to the company. Personal credit belongs to the user.
- A company payment does not automatically transfer credit to an employee.
- An invoice payment is allocated to that invoice. Surplus is company-owned only when payer and owner are explicit. Otherwise it stays unallocated.
- Historical discrepancies are not turned into credit automatically.
- A company-to-employee transfer needs an authorized tenant or company administrator, an employee, an amount, and a reason. Staff and employees cannot transfer company credit to themselves. Automation is out of scope.
- The transfer must be an atomic, idempotent, immutable ledger pair with actor, time, amount, both accounts, reason, and a source reference when one exists. Reversals compensate. They do not delete the original row. The server checks tenant and ownership.

Still open, and still listed in the design: mixed individual-and-company receipts, other uses of an unallocated remainder, any later human backfill, the Firmenkurs contact user, and whether staff may apply company credit to a company invoice. Live schema facts below stay unverified until a person runs the preflight.

## 2. Preflight script

Canonical script: `artifacts/handoffs/PR_467_COMPANY_CREDIT_PREFLIGHT.sql`

It is one `SELECT`. It does not insert, update, delete, or change the catalog. A person copies it into a database session they choose. This task did not run it.

Result columns are `section`, `check_name`, `status`, `detail`.

`status` is `present`, `ok`, `missing_schema_prerequisite`, or a constraint/index class such as `foreign_key` or `unique_index`.

`detail` for a missing object names the table or column that blocked the check. Group rows look like `billing_type|company_id_null|bill_to_kind_column_absent|tenant_id_present|3`. Relationship rows look like `company_linked=4|missing_company_row=0|tenant_mismatch=1|invoice_tenant_null=0`. Values outside `individual`, `company`, `user`, and null are folded to `other`. Names, emails, and payment references are not selected.

## 3. How each result affects the next design phase

| Result | Next design phase |
| --- | --- |
| `invoices.user_id` present and `is_nullable = NO` | Firmenkurs cannot rely on `user_id` null. Phase H still needs a real contact user. Do not drop `NOT NULL` from this result alone. |
| `invoices.user_id` present and `is_nullable = YES` | Null user rows can already exist. The null-user group count is then required before any bill-to backfill. Still no automatic credit. |
| `invoices.user_id` missing | Stop. Invoice ownership cannot be designed until that column is explained. |
| `invoices.company_id` missing | Phase C cannot add a composite tenant key on that column until a reviewed migration adds it. Company bill-to stays unverified. |
| `bill_to_kind` or `bill_to_company_id` missing | Expected. Those columns are proposed, not current. Phase C is where they would be added. |
| `companies.tenant_id` or `users.company_id` missing | Do not invent the company-employee link in a migration. The assignment API’s foreign-key name stays an application inference. |
| `student_credits` / `credit_transactions` column list | Personal credit stays on the listed key. Company credit remains a new account. Do not copy balances. |
| `invoice_payments.idempotency_key` missing | The #467 migration is not in this database. Do not treat keyed replay as live. |
| Unique index on `(tenant_id, idempotency_key)` present | A later receipt key must not collide with that index’s meaning. Partial indexes are listed under `index`. |
| `invoices_user_id_null_groups` count above zero | Those invoices have no individual recipient in `user_id`. They stay unresolved until a person assigns a bill-to. No credit is created from the count. |
| `no_matching_rows` for that check | No null `user_id` in the scanned table. This does not prove the column is `NOT NULL`. Read `focus_column` for nullability. |
| `tenant_mismatch` or `missing_company_row` above zero | Phase C’s company foreign key would fail or would need a cleanup decision first. Do not auto-repair. |
| `student_credit` `tenant_mismatch` or `missing_user` above zero | Personal ledger history is not a clean source for a new company ledger. Do not reconcile it in the preflight. |
| Permission error | That fact stays unknown. Do not read it as zero. |

## 4. Repository facts versus facts that need this script

Confirmed from repository files, not from a database:

- Checked-in `database_migration_invoices.sql` declares `invoices.user_id` `NOT NULL`. No later file in the repo drops it. `course-enrollment-billing.ts` still inserts `user_id: null` for a Firmenkurs.
- `bill_to_kind` and `bill_to_company_id` appear only as a proposal in the design document. No migration adds them.
- `invoices.company_id` and `users.company_id` are used by application code. The repo has no `CREATE TABLE companies` and no `ADD COLUMN` for `invoices.company_id`.
- `student_credits` and `credit_transactions` are personal. `increment_balance` keys them by user and tenant. No writer credits `companies.id`.
- `migrations/20261017_settlement_integrity_hardening.sql` adds nullable `invoice_payments.idempotency_key` and a partial unique index. Whether any database has applied it is unknown.
- Invoice settlement still caps `paid_amount_rappen` and stores the requested amount on the journal. Surplus is not credit.

Requires a person to run the preflight before the next schema phase:

- Live nullability of `invoices.user_id`.
- Live presence of `invoices.company_id`, `users.company_id`, `companies.tenant_id`, and the proposed bill-to columns.
- Live column lists, foreign keys, and unique indexes, including partial idempotency indexes.
- Counts of null `user_id`, broken company links, and personal-credit rows whose user or tenant does not match.

## 5. Files changed

- `artifacts/handoffs/PR_467_OVERPAYMENT_CORPORATE_CREDIT_DESIGN.md`
- `artifacts/handoffs/PR_467_COMPANY_CREDIT_PREFLIGHT.sql`
- `artifacts/handoffs/PR_467_COMPANY_CREDIT_POLICY_PREFLIGHT.md`

The commit SHA is recorded in the commit that adds this file on `cursor/settlement-integrity-hardening-4274`.

## 6. Safety confirmation

No database was accessed. The preflight SQL was not executed. No migration was applied. No payment, invoice, credit, refund, or settlement logic was changed. No application code or test was changed. PR #467 was not merged, deployed, or taken out of Draft. PR #471 was not modified.
