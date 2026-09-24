-- Remove latent anon DML on public.course_sessions.
-- RLS already blocks anonymous writes: there is no anon or public
-- INSERT, UPDATE, or DELETE policy. The grants remain and would become
-- usable if a later policy targeted anon or public.
-- SELECT stays revoked by 20260913_p1. Authenticated and service_role
-- grants and all policies are untouched.
-- Idempotent: REVOKE of a privilege that is already absent is a no-op.
-- Do not apply this to production from the implementation agent.
-- Rollback (re-opens the latent grant):
--   GRANT INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.course_sessions TO anon;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.course_sessions FROM anon;
