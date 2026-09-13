-- P0-01: contain anonymous/public SELECT on course_sessions.
-- Live production policy (unyjaetebnaexaflpyoc, verified 2026-09-13):
--   "course_sessions_public_read"  SELECT TO public  USING (true)
--   — every session row, every tenant, via PostgREST + anon GRANT SELECT.
-- Git has no prior CREATE POLICY for this name; the live definition matches
-- COURSES_PUBLIC_PAGES_GUIDE.md.
-- Public Nitro APIs (public.get, enroll-cash/wallee, available-sessions) use
-- service_role and are unaffected. The category page embeds start_time via
-- the anon/authenticated client, so SELECT for public-course sessions must remain.
-- Authenticated tenant SELECT/INSERT/UPDATE/DELETE policies are unchanged.
-- Do not apply this to production from the implementation agent.
-- Rollback: DROP this policy and recreate USING (true) as documented above.

DROP POLICY IF EXISTS "course_sessions_public_read" ON public.course_sessions;

CREATE POLICY "course_sessions_public_read"
ON public.course_sessions
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id = course_sessions.course_id
      AND c.is_public = true
  )
);
