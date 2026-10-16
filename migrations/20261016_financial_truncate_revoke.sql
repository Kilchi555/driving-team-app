-- Financial TRUNCATE containment — 2026-10-16
-- Create only. Do not apply automatically to production.
-- Idempotent REVOKE of TRUNCATE only.
-- Does not REVOKE SELECT, INSERT, UPDATE, DELETE, REFERENCES, or TRIGGER.
-- Does not GRANT any privilege.
-- Does not DROP or CREATE policies.
-- Does not ENABLE or FORCE ROW LEVEL SECURITY.
-- Does not change table ownership.
--
-- Live catalog re-read 2026-10-16 (unyjaetebnaexaflpyoc), read-only:
--   TRUNCATE held by anon and/or authenticated:
--     invoices, invoice_items, product_sales: authenticated
--     invoice_payments, bank_import_records, student_credits,
--       credit_transactions: anon and authenticated
--   payments: TRUNCATE already limited to postgres and service_role.
--     Included here so a reappearing grant is removed without touching
--     the Slice A SELECT / service_role model.
--   Table owner: postgres. RLS is enabled and not forced on all eight.
--   anon and authenticated do not bypass RLS.
--   postgres and service_role do bypass RLS, so forcing RLS would not
--   constrain the migration owner or the server routes that write these
--   tables. Forcing RLS is intentionally absent from this file.
--   invoice_payments_tenant_access is unchanged.
--
-- Default privileges in schema public for tables (defaclobjtype 'r'):
--   postgres and supabase_admin both grant arwdDxtm to anon and
--   authenticated. The letter D is TRUNCATE.
--
-- The SQL editor role observed on 2026-10-16 is postgres. That role is
-- not superuser and is not a member of supabase_admin, so it cannot
-- alter default privileges owned by supabase_admin. This file always
-- corrects the postgres default. The supabase_admin default is altered
-- only when the applying role is allowed to do so. Otherwise the DO
-- block emits a NOTICE and leaves this statement for a supabase_admin
-- session:
--
--   ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
--     REVOKE TRUNCATE ON TABLES FROM anon, authenticated;
--
-- service_role and the table owner keep TRUNCATE. Payment routes use
-- service_role. Migration and admin maintenance stay on the owner role.
--
-- Read-only verification, run before and after, outside this transaction:
--
-- SELECT table_name, grantee
-- FROM information_schema.role_table_grants
-- WHERE table_schema = 'public'
--   AND privilege_type = 'TRUNCATE'
--   AND table_name IN (
--     'invoices','invoice_items','invoice_payments','payments',
--     'product_sales','bank_import_records','student_credits',
--     'credit_transactions'
--   )
-- ORDER BY 1, 2;
--
-- After apply, anon and authenticated must be absent from that result.
-- postgres and service_role must still appear for each of the eight tables.
--
-- SELECT has_table_privilege('anon', 'public.invoice_payments', 'TRUNCATE')
--          AS anon_invoice_payments,
--        has_table_privilege('authenticated', 'public.invoices', 'TRUNCATE')
--          AS authenticated_invoices,
--        has_table_privilege('service_role', 'public.invoices', 'TRUNCATE')
--          AS service_role_invoices;
--
-- SELECT pg_get_userbyid(defaclrole) AS owner_role, defaclacl::text
-- FROM pg_default_acl
-- WHERE defaclnamespace = 'public'::regnamespace
--   AND defaclobjtype = 'r';
--
-- After apply, the postgres ACL must not contain D for anon or
-- authenticated. The supabase_admin ACL changes only when the DO branch
-- actually executes the nested ALTER.

BEGIN;

REVOKE TRUNCATE ON TABLE public.invoices FROM anon, authenticated;
REVOKE TRUNCATE ON TABLE public.invoice_items FROM anon, authenticated;
REVOKE TRUNCATE ON TABLE public.invoice_payments FROM anon, authenticated;
REVOKE TRUNCATE ON TABLE public.payments FROM anon, authenticated;
REVOKE TRUNCATE ON TABLE public.product_sales FROM anon, authenticated;
REVOKE TRUNCATE ON TABLE public.bank_import_records FROM anon, authenticated;
REVOKE TRUNCATE ON TABLE public.student_credits FROM anon, authenticated;
REVOKE TRUNCATE ON TABLE public.credit_transactions FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE ON TABLES FROM anon, authenticated;

DO $financial_truncate_defaults$
BEGIN
  IF pg_has_role(current_user, 'supabase_admin', 'MEMBER')
     OR COALESCE((SELECT rolsuper FROM pg_roles WHERE rolname = current_user), false) THEN
    EXECUTE $revoke$
      ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
        REVOKE TRUNCATE ON TABLES FROM anon, authenticated
    $revoke$;
  ELSE
    RAISE NOTICE 'financial truncate: current_user % cannot alter default privileges for supabase_admin; that default remains until a supabase_admin session runs the statement in the header', current_user;
  END IF;
END
$financial_truncate_defaults$;

COMMIT;
