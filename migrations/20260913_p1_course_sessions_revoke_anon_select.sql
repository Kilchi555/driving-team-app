-- P1: revoke anonymous PostgREST SELECT on public.course_sessions.
-- P0-01 (course_sessions_public_read) only filters rows. Anon GRANT SELECT
-- still allowed select=* including external_instructor_email/phone and
-- internal columns on public-course sessions.
-- The category page no longer embeds course_sessions; public HTTP APIs
-- use service_role and are unchanged.
-- Live SELECT grantees (verified at P0-01 apply, 2026-09-13):
--   anon, authenticated, postgres, service_role
--   — no SQL GRANT SELECT TO PUBLIC observed.
-- Authenticated and service_role grants are left untouched.
-- Do not apply this to production from the implementation agent.
-- Rollback: GRANT SELECT ON TABLE public.course_sessions TO anon;

REVOKE SELECT ON TABLE public.course_sessions FROM anon;
