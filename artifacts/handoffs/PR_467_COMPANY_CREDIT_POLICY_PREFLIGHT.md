# PR #467 company-credit policy and read-only preflight

Documentation only. The credit feature is not implemented. This correction does not authorize anyone to run the SQL.

Observed 2026-10-17. PR #467: https://github.com/Kilchi555/driving-team-app/pull/467

- Branch: `cursor/settlement-integrity-hardening-4274`
- Parent of this correction: `50da701552d3229083793a8e02ed18b838d83602`
- Base: `1991c4398950cdeb0b0dc0730ae3bceb52c8864d`
- State: OPEN, Draft

The earlier preflight was one `SELECT` that used `information_schema` and `query_to_xml`. That shape is withdrawn. The script below replaces it.

## 1. Product decisions

Recorded in `artifacts/handoffs/PR_467_OVERPAYMENT_CORPORATE_CREDIT_DESIGN.md` under “Agreed product policy (added 2026-10-17)” and in section 9.

- Company credit belongs to the company. Personal credit belongs to the user.
- A company payment does not automatically transfer credit to an employee.
- An invoice payment is allocated to that invoice. Surplus is company-owned only when payer and owner are explicit. Otherwise it stays unallocated.
- Historical discrepancies are not turned into credit automatically. The preflight does not convert them.
- A company-to-employee transfer needs an authorized tenant or company administrator, an employee, an amount, and a reason. Staff and employees cannot transfer company credit to themselves. Automation is out of scope.
- The transfer must be an atomic, idempotent, immutable ledger pair with actor, time, amount, both accounts, reason, and a source reference when one exists. Reversals compensate. They do not delete the original row. The server checks tenant and ownership.

Still open, and still listed in the design: mixed individual-and-company receipts, other uses of an unallocated remainder, any later human backfill, the Firmenkurs contact user, and whether staff may apply company credit to a company invoice. Live schema and live row facts stay UNKNOWN until a person chooses to run the preflight. This document does not make that choice.

## 2. Corrected preflight

Canonical script: `artifacts/handoffs/PR_467_COMPANY_CREDIT_PREFLIGHT.sql`

It is twelve statements. Run one statement at a time, in order. Do not wrap the file in `BEGIN`. Do not execute it as one script. If a statement errors, stop. An error is not a zero count and is not `ok`. Results already returned by earlier statements stand only when the client keeps them, which is why the statements are separate.

| Statement | Lines | What it reads | Run when |
| --- | --- | --- | --- |
| 1 | 28–72 | Session role, `rolbypassrls`, `rolsuper`, `row_security`, `search_path`, `server_version` | Always first |
| 2 | 74–256 | `pg_class`, `pg_attribute`, `pg_type` for schema `public` | After statement 1 |
| 3 | 258–573 | `pg_index` shapes. Predicate text is not returned | After statement 2 |
| 4 | 575–711 | Primary keys, foreign-key columns, check counts. Check bodies are not returned | After statement 2. Independent of statement 3 |
| 5 | 713–774 | `invoices.user_id IS NULL` | Statement 2 has `present` for `invoices.row_visibility` and `invoices.user_id` |
| 6 | 776–848 | That null set partitioned by `billing_type` | Also `invoices.billing_type` is `present` |
| 7 | 850–914 | That null set partitioned by `company_id` null or not | Also `invoices.company_id` is `present` |
| 8 | 916–981 | That null set partitioned by `tenant_id` null or not | Also `invoices.tenant_id` is `present` |
| 9 | 983–1094 | Invoice-to-company join | Both tables' `row_visibility` and `invoices.company_id`, `invoices.tenant_id`, `companies.id`, `companies.tenant_id` are `present` |
| 10 | 1096–1200 | User-to-company join | Both tables' `row_visibility` and `users.company_id`, `users.tenant_id`, `companies.id`, `companies.tenant_id` are `present` |
| 11 | 1202–1314 | Personal-credit user and tenant join | Both tables' `row_visibility` and `student_credits.user_id`, `student_credits.tenant_id`, `users.id`, `users.tenant_id` are `present` |
| 12 | 1316–end | Optional `bill_to_kind` partition | Only if `invoices.bill_to_kind` is `present`. Skip it otherwise. The repository does not add that column |

Statements 1–4 do not use application tables in `FROM` or `JOIN`. Names appear only as text compared with `pg_class.relname` and `pg_attribute.attname`. A missing `companies` table does not fail statements 1–4.

Statements 5–12 name real tables. PostgreSQL resolves those names while planning the statement. If a required column is absent, that statement errors. Do not read the error as `absent` or as zero. Statement 2 is the absence result.

`information_schema` is not used. A column missing from `information_schema.columns` can mean the role cannot see it. This script uses `pg_attribute`. `absent` means no visible `pg_class` or `pg_attribute` row in schema `public`. `inconclusive` means the object was found, or the relation kind is not an ordinary or partitioned table, and the script will not call that a missing column. If `pg_class` itself is unreadable, statement 2 errors. That error is inconclusive, not absence.

## 3. Result contract

Every statement returns `section`, `check_name`, `status`, `detail`.

`status` is only:

| Status | Meaning |
| --- | --- |
| `present` | Catalog object or session fact is visible. For `row_visibility`, row security is off on an ordinary table and table `SELECT` is granted. That row is not a count |
| `absent` | No matching catalog row in schema `public` for an ordinary or partitioned table |
| `inconclusive` | Privilege, relation kind, row security, or an unrecognized predicate. Not proof of absence and not a count |
| `definition_mismatch` | The named index is on the expected table, and uniqueness, column order, or the partial flag differs. The live predicate text is not shown |
| `withheld` | At least one check constraint exists. Its body is not shown |
| `ok` | A count finished. Emitted only by statements 5–12, and only when each named relation is an ordinary table, `relrowsecurity` is false, and `SELECT` is granted on the relation and the named columns |

`ok` is not emitted for a table with row security enabled, including when `rolbypassrls`, `rolsuper`, or ownership might bypass it. Those facts are reported in statements 1 and 2 and are not treated as proof that a zero is the stored count. `owner_is_current_user` compares `pg_class.relowner` with `current_user` only. Role membership is not followed. Policies are not interpreted. Partition children are not inspected. A partitioned table stays `inconclusive` for visibility.

These shapes are the statement text, not live results. `N` stands for digits and appears only with `status = ok`.

```text
section   check_name                         status         detail
session   current_user                       present        <session role>
session   rolbypassrls                       present        true
table     invoices                           absent         absent_from_public
table     invoices.row_visibility            inconclusive   row_visibility_not_established|not_a_row_count
column    invoices.user_id                   present        not_null=true|type=uuid
column    invoices.company_id                inconclusive   select_privilege_not_established|not_null=false|type=uuid
column    invoices.bill_to_kind              absent         column_absent_from_pg_attribute
index     invoice_payments_idempotency_key_uidx  present    matches_repository_shape|actual_columns=tenant_id,idempotency_key|coverage=invoice_payment_idempotency
index     credit_transactions_invoice_deposit_uidx  inconclusive  predicate_text_not_compared|actual_columns=tenant_id,reference_id|coverage=invoice_deposit_reference_not_company_credit
constraint invoices.check_constraints         withheld       check_count=2|bodies_withheld
constraint companies.foreign_key              present        foreign_key_count=0
aggregate invoices.user_id_null_count         inconclusive   row_visibility_not_established
aggregate invoices.user_id_null_count         ok             predicate=user_id_is_null|user_id_null=N
aggregate invoices.company_link               ok             unit=join_row|not_deduplicated|join=invoices.company_id=companies.id|predicate=company_id_is_not_null|company_linked=N|missing_company_row=N|both_tenants_null=N|invoice_tenant_null=N|company_tenant_null=N|tenant_mismatch=N|tenant_match=N
aggregate student_credits.user_tenant_link   ok             unit=join_row|not_deduplicated|join=student_credits.user_id=users.id|user_id_null=N|user_id_unresolved=N|both_tenants_null=N|credit_tenant_null=N|user_tenant_null=N|tenant_mismatch=N|tenant_match=N
```

`not_null=` is `pg_attribute.attnotnull`. It is not a count of null rows. Statement 5 is the null-row count, and only when its status is `ok`.

Statement 6 partitions `user_id IS NULL` into `individual`, `company`, `billing_type_null`, and `billing_type_other`. The four parts do not overlap. Any other stored value is counted as `billing_type_other` and is not printed. Statement 12 does the same for `bill_to_kind` under `bill_to_kind_other`.

Statement 9's six counts after `company_linked` partition `company_linked` and do not overlap. `tenant_mismatch` requires both tenant ids to be non-null and different. A null tenant is `both_tenants_null`, `invoice_tenant_null`, or `company_tenant_null`. `missing_company_row` is a non-null `company_id` with no `companies.id`. The unit is a join row. If `companies.id` is not unique, one invoice can be counted more than once. Statement 10 uses the same partition for `users.company_id`.

Statement 11's seven counts partition the join and do not overlap. `user_id_null` is a null `student_credits.user_id`. `user_id_unresolved` is a non-null `user_id` with no `users.id`. A null user id is not unresolved.

The script does not select names, emails, payment references, descriptions, metadata values, or raw company or user ids. `current_user` is the session role, not a customer. Check bodies and live index predicates are not selected. Index expressions are reported as the word `expression`.

`payment_description_and_metadata_keys` is `inconclusive` / `not_inspected`. The description indexes in statement 3 are index objects. Their coverage label says the description values were not read. `bank_import_records` is included because `sql_migrations/20260721_camt_import_dedup.sql` and the rename migration define `UNIQUE (tenant_id, dedupe_key)`, and settlement calls that table. Coverage is `bank_import_dedupe_not_company_credit`. A missing exact index name does not prove the shape is missing: read the `any_unique` or `any_partial` row.

`historical_discrepancies` is `present` / `not_converted_by_this_script`.

## 4. How a result affects the next design phase

| Result | Next design phase |
| --- | --- |
| `invoices.user_id` `present` and `not_null=true` | Firmenkurs cannot rely on a null `user_id`. Phase H still needs a real contact user. Do not drop `NOT NULL` from this result alone |
| `invoices.user_id` `present` and `not_null=false` | Null user rows can already be stored. Run statement 5 only if `invoices.row_visibility` is also `present`. Still no automatic credit |
| `invoices.user_id` `absent` | Stop. Do not design invoice ownership until that catalog gap is explained |
| `invoices.user_id` `inconclusive` | Do not treat the column as missing. The privilege or relation kind is unresolved |
| `invoices.company_id` `absent` | Phase C cannot add a composite tenant key on that column until a reviewed migration adds it |
| `bill_to_kind` or `bill_to_company_id` `absent` | Expected from the repository. Those columns are proposed. Do not run statement 12 |
| `invoices.row_visibility` `inconclusive` | Do not run a count. A visible zero would not prove the stored count |
| `invoice_payments_idempotency_key_uidx` `present` | The name, columns, uniqueness, partial flag, and the known `idempotency_key IS NOT NULL` spellings matched. A later receipt key must not reuse that meaning |
| That index `inconclusive` | The columns matched and the predicate text was not one of the two known spellings, or it was not compared. Do not treat the name as proof of the `WHERE` clause |
| That index `absent` | The exact name is not on `public.invoice_payments`. Also read `invoice_payments.any_partial_unique_tenant_id_idempotency_key` |
| `student_credits.any_unique_user_id_tenant_id` `absent` | The repository does not contain one agreed `CREATE UNIQUE` for that pair. `increment_balance` still uses `ON CONFLICT (user_id, tenant_id)`. Live uniqueness stays UNKNOWN |
| Statement 9 or 11 `ok` with any mismatch or unresolved count above zero | Do not auto-repair and do not copy those rows into company credit |
| Any count `inconclusive`, or any statement error | That fact stays UNKNOWN. Do not read it as zero |

## 5. Repository facts versus facts this script cannot know

Confirmed from repository files, not from a database:

- Checked-in `database_migration_invoices.sql` declares `invoices.user_id` `NOT NULL`. No later file in the repo drops it. `course-enrollment-billing.ts` still inserts `user_id: null` for a Firmenkurs.
- `bill_to_kind` and `bill_to_company_id` appear only as a proposal in the design document. No migration adds them.
- `invoices.company_id` and `users.company_id` are used by application code. The repo has no `CREATE TABLE companies` and no `ADD COLUMN` for `invoices.company_id`.
- `student_credits` and `credit_transactions` are personal. `increment_balance` keys them by user and tenant. No writer credits `companies.id`. `cleanup_duplicate_student_credits.sql` adds `UNIQUE (user_id)`. Later SQL uses `ON CONFLICT (user_id, tenant_id)`. Those are not the same constraint.
- `migrations/20261017_settlement_integrity_hardening.sql` adds nullable `invoice_payments.idempotency_key` and partial unique index `invoice_payments_idempotency_key_uidx` on `(tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL`.
- The same migration adds `credit_transactions_invoice_deposit_uidx` and `credit_transactions_bulk_cash_overpay_uidx`. `migrations/20261005_staff_pos_deferred_overpay_idempotency.sql` adds `credit_transactions_staff_pos_deferred_overpay_uidx`. Whether any database has applied them is UNKNOWN.
- `sql_migrations/20260721_camt_import_dedup.sql` creates `UNIQUE (tenant_id, dedupe_key)`. The rename migration names that constraint `bank_import_records_tenant_id_dedupe_key_key`.
- Invoice settlement still caps `paid_amount_rappen` and stores the requested amount on the journal. Surplus is not credit.

UNKNOWN until a person runs the statements and reads them under the contract above:

- Live nullability, privileges, relation kind, and row security.
- Live presence of company and bill-to columns.
- Whether `pg_get_expr` spells the idempotency predicate as one of the two strings the script accepts.
- Every count. Nothing in the repository is a count of production rows.

## 6. Files in this correction

- `artifacts/handoffs/PR_467_COMPANY_CREDIT_PREFLIGHT.sql`
- `artifacts/handoffs/PR_467_COMPANY_CREDIT_POLICY_PREFLIGHT.md`
- `artifacts/handoffs/PR_467_COMPANY_CREDIT_PREFLIGHT_REVIEW.md`
- `artifacts/handoffs/PR_467_OVERPAYMENT_CORPORATE_CREDIT_DESIGN.md` (phase 1 now says the script is twelve statements)

## 7. Safety confirmation

No database was accessed. The preflight SQL was not executed and was not parsed by a server. No migration was applied. No payment, invoice, credit, refund, or settlement logic was changed. No application code or test was changed. PR #467 was not merged, deployed, or taken out of Draft.
