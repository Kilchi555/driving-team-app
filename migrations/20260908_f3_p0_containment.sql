-- F-3 P0 containment — 2026-09-08
-- Create only. Do not apply automatically to production.
-- Apply only to a confirmed non-production project (simy-test) after the
-- application replacements in this branch are deployed to that environment.
-- Idempotent: DROP POLICY IF EXISTS + REVOKE.
-- Does not delete rows, invitations, storage objects, or credentials.
-- Does NOT ALTER DEFAULT PRIVILEGES.
--
-- Closes remaining F-3 holes after 20260907_p0_incident_containment.sql:
--   vouchers / voucher_codes     anon SELECT enumeration (gift-card PII, codes)
--   course_sessions              anon SELECT of instructor/internal session data
--   availability_slots           anon INSERT/UPDATE/DELETE (public booking is
--                                already server API → getSupabaseAdmin())
--   course_waitlist              anon INSERT WITH CHECK (true)
--
-- Intentionally kept:
--   anon SELECT on availability_slots (select_available_slots_for_listing)
--   authenticated tenant policies on course_sessions / course_waitlist / vouchers
--   service_role access used by /api/booking/*, /api/discounts/validate,
--   /api/vouchers/*, /api/courses/public, /api/courses/waitlist-signup
--
-- ============================================================================
-- ROLLBACK — restores the live catalog captured on 2026-09-08. Emergency only.
-- Re-opens the incident.
--
-- GRANT ALL ON TABLE public.vouchers TO anon;
-- GRANT ALL ON TABLE public.voucher_codes TO anon;
-- GRANT ALL ON TABLE public.course_sessions TO anon;
-- GRANT INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.availability_slots TO anon;
-- GRANT INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.course_waitlist TO anon;
--
-- CREATE POLICY "Anon can lookup active vouchers" ON public.vouchers
--   FOR SELECT TO public
--   USING ((is_active = true) AND (redeemed_at IS NULL)
--     AND ((valid_from IS NULL) OR (valid_from <= now()))
--     AND ((valid_until IS NULL) OR (valid_until > now())));
-- CREATE POLICY "Anon can lookup active vouchers by code" ON public.vouchers
--   FOR SELECT TO public
--   USING ((is_active = true) AND (redeemed_at IS NULL)
--     AND ((valid_from IS NULL) OR (valid_from <= now()))
--     AND ((valid_until IS NULL) OR (valid_until > now())));
-- CREATE POLICY "Prevent anon deletes from vouchers" ON public.vouchers
--   FOR DELETE TO public USING (false);
-- CREATE POLICY "Prevent anon updates to vouchers" ON public.vouchers
--   FOR UPDATE TO public USING (false) WITH CHECK (false);
-- CREATE POLICY "Anon can lookup active voucher codes" ON public.voucher_codes
--   FOR SELECT TO public
--   USING ((is_active = true)
--     AND ((valid_from IS NULL) OR (valid_from <= now()))
--     AND ((valid_until IS NULL) OR (valid_until > now())));
-- CREATE POLICY "Anon can lookup active voucher codes by code and tenant"
--   ON public.voucher_codes FOR SELECT TO public
--   USING ((is_active = true)
--     AND ((valid_from IS NULL) OR (valid_from <= now()))
--     AND ((valid_until IS NULL) OR (valid_until > now())));
-- CREATE POLICY "Prevent anon deletes from voucher_codes" ON public.voucher_codes
--   FOR DELETE TO public USING (false);
-- CREATE POLICY "Prevent anon updates to voucher_codes" ON public.voucher_codes
--   FOR UPDATE TO public USING (false) WITH CHECK (false);
-- CREATE POLICY course_sessions_public_read ON public.course_sessions
--   FOR SELECT TO public USING (true);
-- CREATE POLICY update_available_slots ON public.availability_slots
--   FOR UPDATE TO anon
--   USING ((reserved_by_session IS NULL) OR (reserved_until < now()))
--   WITH CHECK ((tenant_id IS NOT NULL) AND (staff_id IS NOT NULL) AND (
--     ((reserved_until IS NULL) AND (reserved_by_session IS NULL))
--     OR ((reserved_until IS NOT NULL) AND (reserved_by_session IS NOT NULL))));
-- CREATE POLICY release_own_reservation ON public.availability_slots
--   FOR UPDATE TO anon
--   USING ((auth.jwt() ->> 'session_id') = (reserved_by_session)::text)
--   WITH CHECK ((auth.jwt() ->> 'session_id') = (reserved_by_session)::text);
-- CREATE POLICY course_waitlist_public_insert ON public.course_waitlist
--   FOR INSERT TO anon, authenticated WITH CHECK (true);
-- ============================================================================

-- ============================================================================
-- Vouchers / voucher_codes — public lookup is POST /api/discounts/validate
-- and POST /api/vouchers/lookup (service_role). Shop and Wallee re-resolve
-- the code server-side. Do not restore anon SELECT.
-- ============================================================================

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon can lookup active vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Anon can lookup active vouchers by code" ON public.vouchers;
DROP POLICY IF EXISTS "Prevent anon deletes from vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Prevent anon updates to vouchers" ON public.vouchers;

DROP POLICY IF EXISTS "Anon can lookup active voucher codes" ON public.voucher_codes;
DROP POLICY IF EXISTS "Anon can lookup active voucher codes by code and tenant" ON public.voucher_codes;
DROP POLICY IF EXISTS "Prevent anon deletes from voucher_codes" ON public.voucher_codes;
DROP POLICY IF EXISTS "Prevent anon updates to voucher_codes" ON public.voucher_codes;

REVOKE ALL ON TABLE public.vouchers FROM anon;
REVOKE ALL ON TABLE public.vouchers FROM PUBLIC;
REVOKE ALL ON TABLE public.voucher_codes FROM anon;
REVOKE ALL ON TABLE public.voucher_codes FROM PUBLIC;

-- ============================================================================
-- course_sessions — public list is GET /api/courses/public (service_role).
-- Legacy pages/courses/category/[category].vue now uses that API.
-- Authenticated tenant policies stay.
-- ============================================================================

ALTER TABLE public.course_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS course_sessions_public_read ON public.course_sessions;

REVOKE ALL ON TABLE public.course_sessions FROM anon;
REVOKE ALL ON TABLE public.course_sessions FROM PUBLIC;

-- ============================================================================
-- availability_slots — public booking is:
--   GET  /api/booking/get-available-slots
--   POST /api/booking/reserve-slot   (atomic claim, service_role)
--   POST /api/booking/guest-book | create-appointment
-- Anon SELECT listing is kept this pass. Anon DML is removed.
-- select_available_slots_for_listing is left in place.
-- ============================================================================

ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS update_available_slots ON public.availability_slots;
DROP POLICY IF EXISTS release_own_reservation ON public.availability_slots;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.availability_slots FROM anon;

-- ============================================================================
-- course_waitlist — public signup is POST /api/courses/waitlist-signup and
-- POST /api/courses/category-waitlist-signup (service_role). Staff inserts
-- remain on authenticated course_waitlist_tenant_access.
-- ============================================================================

ALTER TABLE public.course_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS course_waitlist_public_insert ON public.course_waitlist;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.course_waitlist FROM anon;
