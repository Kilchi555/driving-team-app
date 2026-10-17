# Financial database privilege hardening

Date: 2026-10-16

Verdict: draft migration only. It was not applied to production. `FORCE ROW LEVEL SECURITY` was not enabled.

## Branch

- Repository: `Kilchi555/driving-team-app`
- Branch: `cursor/financial-truncate-grants-4274`
- Base: `e1248c0b7fc5a08a439e9c3e1c15a3ce175a1a2e`
- Migration commit: `8ce776b9061018c69c1eb74e2bc12079f0d2e1cc`
- Handoff file introduced in: `a44ded2be8797365f9756c1b37968638f9f12270`
- Draft head: the child of `a44ded2b` that records this line. Read `git rev-parse HEAD` on the pushed branch before review.

## Catalog re-read

Read-only SQL on project `unyjaetebnaexaflpyoc` as `postgres` on 2026-10-16, before any change. `postgres` is not superuser (`rolsuper = false`) and is not a member of `supabase_admin`.

`TRUNCATE` grantees:

| Table | anon | authenticated | service_role | postgres |
| --- | --- | --- | --- | --- |
| invoices | no | yes | yes | yes |
| invoice_items | no | yes | yes | yes |
| product_sales | no | yes | yes | yes |
| invoice_payments | yes | yes | yes | yes |
| bank_import_records | yes | yes | yes | yes |
| student_credits | yes | yes | yes | yes |
| credit_transactions | yes | yes | yes | yes |
| payments | no | no | yes | yes |

`PUBLIC` was not a `TRUNCATE` grantee on these tables. All eight tables are owned by `postgres`. RLS is enabled. RLS is not forced.

Role flags:

- `anon`: no bypass RLS
- `authenticated`: no bypass RLS
- `service_role`: bypass RLS
- `postgres`: bypass RLS, not superuser
- `supabase_admin`: superuser, bypass RLS

Default table privileges in `public` (`defaclobjtype = r`), ACL `arwdDxtm` (the letter `D` is `TRUNCATE`):

- owner `postgres`: granted to `postgres`, `anon`, `authenticated`, `service_role`
- owner `supabase_admin`: granted to `postgres`, `anon`, `authenticated`, `service_role`

## Role model used for this change

- `anon` has no justified `TRUNCATE` on these financial tables. `TRUNCATE` ignores RLS.
- `authenticated` has no justified `TRUNCATE` for the same reason. Existing `INSERT` / `UPDATE` / `DELETE` grants were left in place where a tenant policy may still be the intended Data API path.
- `service_role` keeps `TRUNCATE`. Server payment routes use `getSupabaseAdmin()` and bypass RLS. That is the trusted writer for these handlers.
- `postgres` keeps `TRUNCATE` as table owner. Migrations and admin maintenance run as this role. It already bypasses RLS, so forcing RLS would not constrain it.
- `supabase_admin` is the other default-privilege owner. The observed `postgres` session cannot change those defaults.

`payments` already lost `anon` / `authenticated` `TRUNCATE` in `migrations/20260917_payments_jwt_postgrest_slice_a.sql`. This migration repeats that one revoke so it stays idempotent. It does not grant `SELECT` or `ALL` again and does not drop policies.

## What the migration does

File: `migrations/20261016_financial_truncate_revoke.sql`

Inside one transaction:

- `REVOKE TRUNCATE` on the eight tables `FROM anon, authenticated`
- `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE TRUNCATE ON TABLES FROM anon, authenticated`
- if the applying role is a member of `supabase_admin` or is superuser, the same default revoke for `supabase_admin`
- otherwise `RAISE NOTICE` and leave the `supabase_admin` default unchanged

The `supabase_admin` statement a superuser session must still run, if the NOTICE appears:

```sql
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE TRUNCATE ON TABLES FROM anon, authenticated;
```

## What it does not do

- It does not revoke `SELECT`, `INSERT`, `UPDATE`, or `DELETE`.
- It does not grant any privilege.
- It does not drop or create policies.
- It does not `ENABLE` or `FORCE ROW LEVEL SECURITY`.
- It does not change ownership.
- It was not executed against production.

## FORCE ROW LEVEL SECURITY

Not applied.

`anon` and `authenticated` are already subject to RLS. `FORCE ROW LEVEL SECURITY` would also apply RLS to the table owner. The owner here is `postgres`, which has `rolbypassrls`, and `service_role` also bypasses RLS. Forcing RLS would not constrain either trusted role. `TRUNCATE` is not an RLS predicate: a role that still holds `TRUNCATE` can empty the table whether or not RLS is forced. The control for the reported finding is the revoke above.

## invoice_payments policy

`invoice_payments_tenant_access` was not changed.

The live policy is `ALL` for `authenticated` when `tenant_id` matches `users.tenant_id` for `auth.uid()`. It does not require a staff role or `is_active`. Reads and writes found in the invoice payment handlers use the service-role client, including `server/api/invoices/get-invoice-payments.get.ts`. No Vue client insert into `invoice_payments` was found. That is not enough to revoke `authenticated` DML or replace the policy: a staff Data API path may still be intentional, and this draft does not guess it. Narrowing that policy is a separate human decision.

`bank_import_records` DML for `anon` / `authenticated` is also unchanged. The live policy allows `ALL` only for `service_role`, so RLS already denies JWT DML, but the grants remain. `TRUNCATE` was the privilege that bypassed that policy. Revoking the leftover DML grants is a separate decision.

## Verification plan

Do not treat this file as applied. A person runs the queries below read-only before applying, applies the file in a reviewed session, then runs them again.

```sql
SELECT table_name, grantee
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND privilege_type = 'TRUNCATE'
  AND table_name IN (
    'invoices','invoice_items','invoice_payments','payments',
    'product_sales','bank_import_records','student_credits',
    'credit_transactions'
  )
ORDER BY 1, 2;
```

After a successful apply, `anon` and `authenticated` must be absent. `postgres` and `service_role` must still appear on every table.

```sql
SELECT has_table_privilege('anon', 'public.invoice_payments', 'TRUNCATE') AS anon_invoice_payments,
       has_table_privilege('authenticated', 'public.invoices', 'TRUNCATE') AS authenticated_invoices,
       has_table_privilege('service_role', 'public.invoices', 'TRUNCATE') AS service_role_invoices;
```

Expected after apply: `false`, `false`, `true`.

```sql
SELECT pg_get_userbyid(defaclrole) AS owner_role, defaclacl::text
FROM pg_default_acl
WHERE defaclnamespace = 'public'::regnamespace
  AND defaclobjtype = 'r';
```

Expected after apply as `postgres`: the `postgres` ACL no longer contains `D` for `anon` or `authenticated`. The `supabase_admin` ACL changes only when that session actually runs the nested `ALTER`. If it still shows `anon=arwdDxtm/supabase_admin`, the follow-up statement in the migration header has not been run.

Also confirm `INSERT` / `UPDATE` / `DELETE` grants for `authenticated` on `invoices` and `invoice_payments` are still present, so this migration did not remove ordinary DML.

## Tests

`server/utils/__tests__/financial-truncate-grants.test.ts` reads the SQL file and does not connect to a database.

- 3 tests passed (`vitest run server/utils/__tests__/financial-truncate-grants.test.ts`)
- `npx eslint` on that file passed

No production migration was applied, so there is no live after-snapshot.

## Remaining risks

- Until a person applies the file, production `anon` / `authenticated` still have the `TRUNCATE` grants listed above.
- Applied as `postgres`, the `supabase_admin` default privilege remains and will still grant `TRUNCATE` to `anon` and `authenticated` on tables created by `supabase_admin`.
- `authenticated` can still `INSERT` / `UPDATE` / `DELETE` `invoice_payments` where the tenant policy matches.
- `service_role` and `postgres` can still `TRUNCATE`, by design.
- Forcing RLS remains an open design choice and would not remove `TRUNCATE`.

## Next human gate

Review the draft. Do not merge it, apply it, or edit production grants from this agent run. After Test and lint, E2E login, and Dependency review are green on the exact pushed head, a person can apply the migration in a reviewed session, run the verification queries, and run the `supabase_admin` default statement if the NOTICE says it was skipped.
