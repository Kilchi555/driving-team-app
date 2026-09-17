-- F-3 anon Data-API containment — 2026-09-17
-- From current origin/main. Does not cherry-pick #169.
-- Create only. Do not apply automatically to production.
-- Idempotent: DROP POLICY IF EXISTS + REVOKE.
-- Does not ALTER DEFAULT PRIVILEGES.
-- Does not touch tenants, course_sessions, payments, locations, discounts,
-- users privilege-freeze, or storage.objects.
--
-- Live production catalog (unyjaetebnaexaflpyoc, 2026-09-17):
--   vouchers / voucher_codes
--     anon GRANT ALL
--     SELECT policies TO public on active unredeemed rows (no tenant filter)
--   availability_slots
--     anon GRANT ALL including UPDATE
--     update_available_slots / release_own_reservation (anon UPDATE)
--     select_available_slots_for_listing kept (anon SELECT listing)
--   course_waitlist
--     anon GRANT ALL including INSERT
--     course_waitlist_public_insert TO anon, authenticated WITH CHECK (true)
--
-- Public app paths already use getSupabaseAdmin() (service_role, bypasses RLS):
--   POST /api/vouchers/lookup
--   GET  /api/booking/get-available-slots
--   POST /api/booking/reserve-slot
--   POST /api/booking/guest-book
--   POST /api/booking/release-reservation
--   POST /api/courses/waitlist-signup
--   POST /api/courses/category-waitlist-signup
-- Authenticated staff waitlist remains on course_waitlist_tenant_access.
-- Authenticated / admin voucher policies are not dropped.
--
-- Rollback (emergency only — re-opens the Data-API holes):
--   GRANT ALL ON TABLE public.vouchers TO anon;
--   GRANT ALL ON TABLE public.voucher_codes TO anon;
--   GRANT INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.availability_slots TO anon;
--   GRANT INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.course_waitlist TO anon;
--   (recreate the dropped policies from the live catalog captured 2026-09-17)

BEGIN;

-- ============================================================================
-- vouchers / voucher_codes — public lookup is POST /api/vouchers/lookup
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
-- availability_slots — public booking is server API + getSupabaseAdmin()
-- Anon SELECT listing policy is intentionally left in place.
-- ============================================================================

ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS update_available_slots ON public.availability_slots;
DROP POLICY IF EXISTS "update_available_slots" ON public.availability_slots;
DROP POLICY IF EXISTS release_own_reservation ON public.availability_slots;
DROP POLICY IF EXISTS "release_own_reservation" ON public.availability_slots;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.availability_slots FROM anon;

-- ============================================================================
-- course_waitlist — public signup is POST /api/courses/waitlist-signup
-- and POST /api/courses/category-waitlist-signup (service_role).
-- ============================================================================

ALTER TABLE public.course_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS course_waitlist_public_insert ON public.course_waitlist;
DROP POLICY IF EXISTS "course_waitlist_public_insert" ON public.course_waitlist;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.course_waitlist FROM anon;

NOTIFY pgrst, 'reload schema';

COMMIT;
