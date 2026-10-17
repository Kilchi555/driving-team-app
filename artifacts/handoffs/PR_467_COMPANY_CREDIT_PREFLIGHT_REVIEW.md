# PR #467 preflight correction — static review

Reviewed 2026-10-17. Repository and file review only. The SQL was not parsed by a server and was not executed. This review does not authorize a database session.

- PR: https://github.com/Kilchi555/driving-team-app/pull/467
- Branch: `cursor/settlement-integrity-hardening-4274`
- Review baseline: `ecc996abdc05cd6ac6981d6ec1aa016a85daed96`
- Parent of the corrected files: `50da701552d3229083793a8e02ed18b838d83602`
- Canonical SQL: `artifacts/handoffs/PR_467_COMPANY_CREDIT_PREFLIGHT.sql`

Verdict: **CONDITIONAL**

The seven findings are addressed in the source, and the source is read-only on inspection. CONDITIONAL means a person still must not treat the file as checked by PostgreSQL, and must not run it as one script. It is not permission to execute.

## Findings

1. **Privileges versus missing columns.** Resolved. `information_schema` is gone. Statement 2 (lines 74–256) uses `pg_class` and `pg_attribute`. `absent` is only “no visible row in schema `public`”. A found column with `has_column_privilege` not true is `inconclusive` / `select_privilege_not_established`, and the detail still carries `not_null` and `type` from the catalog. A view, materialized view, or foreign table is `inconclusive`, not `absent`. If `pg_class` cannot be read, statement 2 errors. That error is not reported as a missing column.

2. **RLS and execution role.** Resolved in the output contract. Statement 1 (lines 28–72) returns `current_user`, `rolbypassrls`, `rolsuper`, and the `row_security` setting. Statement 2 returns `owner_is_current_user`, `relrowsecurity`, and `relforcerowsecurity`. Ownership is `pg_class.relowner` compared with `current_user` only. Membership, policies, and partition children are not interpreted. `row_visibility` is `present` only when the relation is an ordinary table, row security is disabled, and table `SELECT` is granted. Counts refuse `ok` whenever `relrowsecurity` is true, even if the role might bypass row security. The detail in that case is `row_visibility_not_established` and contains no digit. A zero is therefore not labeled as proof that the table has no matching rows.

3. **XML and count parsing.** Resolved by removal. There is no `query_to_xml`, `xpath`, `unnest` of XML, or `string_agg` of extracted counts. A count is an ordinary aggregate inside the `ok` branch of statements 5–12. `status = ok` is the only status that includes a number of rows. `inconclusive` details for counts are fixed words with no digit. Catalog `foreign_key_count=0` and `check_count=0` are constraint counts in section `constraint`, not row counts. An unreadable extraction cannot occur, because nothing is extracted. A statement that errors returns no `ok` row.

4. **Separate statements.** Resolved. Statements 1–4 do not reference application tables in `FROM` or `JOIN`. A missing `company_id` cannot fail them. Statements 5–12 are separate and each names only the columns in its prerequisite comment. A failure of statement 9 does not discard statement 2 if the client runs them separately and does not wrap the file in one transaction. Statement 12 is optional and is not part of the default sequence. The file says to run one statement at a time and not to use `BEGIN`.

5. **Explicit index coverage.** Resolved. Statement 3 (lines 258–573) returns one row for each required name: `invoice_payments_idempotency_key_uidx`, `credit_transactions_invoice_deposit_uidx`, `credit_transactions_bulk_cash_overpay_uidx`, `credit_transactions_staff_pos_deferred_overpay_uidx`, and `bank_import_records_tenant_id_dedupe_key_key`. The expected columns and partial flag come from the migration files named in the statement comment. The idempotency index is `present` only if the columns are `tenant_id,idempotency_key`, the index is unique and partial, and the normalized predicate is `(idempotency_keyisnotnull)` or `idempotency_keyisnotnull`. Any other predicate is `inconclusive` / `predicate_text_not_compared`. The live predicate is not selected. Shape rows report the same rules without requiring the exact name. `student_credits` has no single repository index name; the shape rows look for a non-partial unique pair `(user_id, tenant_id)` in either order, and separately for `UNIQUE (user_id)`. Description and metadata values are `not_inspected` (statement 2 scope row). The two description indexes are labeled `description_prefix_index_values_not_read`. Bank import coverage is `bank_import_dedupe_not_company_credit`.

6. **Accurate relationship counts.** Resolved. Statement 9 separates `missing_company_row`, `both_tenants_null`, `invoice_tenant_null`, `company_tenant_null`, `tenant_mismatch`, and `tenant_match`. `tenant_mismatch` requires both tenant ids non-null. Statement 10 uses the same split for users. Statement 11 separates `user_id_null` from `user_id_unresolved`, then splits null tenants from non-null mismatches. The comments state that those parts do not overlap and that the unit is a join row. `not_null=` in statement 2 stays a catalog flag, not a row count.

7. **Consistent result contract.** Resolved. Section, check name, status, and detail are the same four columns on every statement. The statuses actually used are `present`, `absent`, `inconclusive`, `definition_mismatch`, `withheld`, and `ok`. The policy handoff lists those and only those, and its examples use the same detail spellings as the SQL. Names, emails, payment references, descriptions, metadata values, and raw ids are not selected. Check bodies are withheld. Index predicates are compared and not displayed.

## Changed files

- `artifacts/handoffs/PR_467_COMPANY_CREDIT_PREFLIGHT.sql` — replaced. Contract header lines 1–26. Statements at lines 28, 74, 258, 575, 713, 776, 850, 916, 983, 1096, 1202, and 1316.
- `artifacts/handoffs/PR_467_COMPANY_CREDIT_POLICY_PREFLIGHT.md` — result contract, execution order, and limitations rewritten.
- `artifacts/handoffs/PR_467_OVERPAYMENT_CORPORATE_CREDIT_DESIGN.md` — phase 1 now says the script is twelve statements.
- `artifacts/handoffs/PR_467_COMPANY_CREDIT_PREFLIGHT_REVIEW.md` — this review.

No application code, test, migration, payment path, or credit writer was changed.

## Static read-only assessment

Inspected the twelve statements, including every aggregate subquery. The file has no `INSERT`, `UPDATE`, `DELETE`, `MERGE`, `TRUNCATE`, `CREATE`, `ALTER`, `DROP`, `GRANT`, `REVOKE`, `SET`, `SELECT INTO`, lock, sequence, or `query_to_xml`. Functions used are `current_user`, `current_setting`, `has_table_privilege`, `has_column_privilege`, `pg_get_expr`, `regexp_replace`, `string_agg`, `unnest`, `string_to_array`, `concat`, `bool_and`, `count`, `lower`, and `coalesce`. Those are read on inspection. `pg_get_expr` is used only to compare a predicate, and its text is not a result column.

Statements 1–4 mention application names only as string literals. A missing application column cannot make those statements refer to a missing `FROM` entry. Statements 5–12 do name tables, so a missing column fails planning of that later statement only.

A count failure cannot erase statement 2 unless the client sends the file as one transaction or discards earlier results. The supported order forbids that.

## Runtime assumptions still unverified

No PostgreSQL server parsed this file. The following stay assumptions:

- `CASE` evaluates only the selected branch. The displayed status does not depend on that for row security: the `inconclusive` branch is first and its detail has no count. An error raised while planning an unselected branch would still abort that one statement.
- `has_table_privilege` and `has_column_privilege` return null rather than raising when an argument is null.
- Permission checks on relations named in an unselected `CASE` branch may raise before the gate returns `inconclusive`. The procedure is to run a count only after statement 2 says `present`. A permission error is not a zero.
- `pg_get_expr` spelling after removing whitespace and lower-casing. A spelling outside the two idempotency strings stays `inconclusive`, so an unknown spelling is not called a match.
- `pg_index.indkey::text` is space-separated numeric attribute numbers. An unexpected token would fail statement 3 only.
- `"char"` comparison for `confdeltype` and `relkind`.
- `current_user` is visible in `pg_roles`. If it is not, statement 1 returns `inconclusive` for the role flags.
- Effective row visibility for a bypass or owner role. The script does not certify counts in that case.
- Client behavior when several statements are sent together. Not tested, and not the supported procedure.

## Statement order

1. Session.
2. Tables, columns, scope.
3. Indexes.
4. Constraints.
5. Null `invoices.user_id` count, only if statement 2 allows it.
6. Billing-type partition of that set.
7. Company-id partition of that set.
8. Tenant-id partition of that set.
9. Invoice company link.
10. User company link.
11. Personal-credit user and tenant link.
12. Optional bill-to partition. Skip unless `invoices.bill_to_kind` is `present`.

Stop at the first error. Do not continue into a later count after an error. Do not convert any result into credit.

## Verdict

**CONDITIONAL.** The source closes the seven misreport paths and stays read-only on static inspection. It is not server-parsed, and statements 5–12 are safe to consider only one at a time after their prerequisites are `present`. That is a condition on use, not a remaining false `ok` or false `absent` in the catalog statements.
