-- Slice A: close direct JWT/PostgREST writes to public.payments.
-- From origin/main. Create only. Do not apply automatically to production.
-- Idempotent: DROP POLICY IF EXISTS + REVOKE.
-- Does not CREATE anon INSERT. Does not CREATE a trigger.
-- Does not touch vouchers, voucher_codes, availability_slots, or course_waitlist.
--
-- Effective boundary after this file:
--   authenticated / anon cannot INSERT, UPDATE, or DELETE payments via the Data API
--   (GRANT revoked; staff/customer/super-admin write policies dropped).
--   SELECT policies remain for legitimate staff/customer/super-admin reads.
--   Server routes continue to use service_role (BYPASSRLS).
--
-- Historical SQL that created anon_insert_shop_payment is not reapplied.

BEGIN;

DROP POLICY IF EXISTS "staff_insert_tenant" ON public.payments;
DROP POLICY IF EXISTS "customer_insert_own" ON public.payments;
DROP POLICY IF EXISTS "staff_update_tenant" ON public.payments;
DROP POLICY IF EXISTS "super_admin_insert_all" ON public.payments;
DROP POLICY IF EXISTS "super_admin_update_all" ON public.payments;
DROP POLICY IF EXISTS "anon_insert_shop_payment" ON public.payments;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.payments FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.payments FROM authenticated;
REVOKE ALL ON TABLE public.payments FROM PUBLIC;

GRANT SELECT ON TABLE public.payments TO authenticated;
GRANT ALL ON TABLE public.payments TO service_role;

COMMENT ON TABLE public.payments IS
  'Slice A (2026-09-17): JWT/PostgREST cannot INSERT/UPDATE/DELETE payments. Reads via RLS SELECT. Writes via service_role server routes only.';

COMMIT;
