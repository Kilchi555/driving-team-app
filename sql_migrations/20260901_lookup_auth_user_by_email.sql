-- Lookup Auth user id by email for staff-invite / onboarding conflict checks.
-- supabase-js v2 has no auth.admin.getUserByEmail; calling it throws and was
-- mis-reported as "already registered in Auth", blocking all staff invites.

CREATE OR REPLACE FUNCTION public.lookup_auth_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, auth, pg_temp
AS $$
  SELECT u.id
  FROM auth.users u
  WHERE p_email IS NOT NULL
    AND length(trim(p_email)) > 0
    AND lower(u.email) = lower(trim(p_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_auth_user_id_by_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lookup_auth_user_id_by_email(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_auth_user_id_by_email(text) TO service_role;

COMMENT ON FUNCTION public.lookup_auth_user_id_by_email(text) IS
  'Service-role only: resolve auth.users.id by email for invite/onboarding checks.';
