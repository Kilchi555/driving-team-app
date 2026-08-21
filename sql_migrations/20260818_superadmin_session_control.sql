-- Superadmin session control: list/revoke Auth sessions (service_role RPC only).
-- Privileged auth.sessions access lives in schema internal.
-- Public wrappers are execute-only for service_role.

CREATE SCHEMA IF NOT EXISTS internal;

REVOKE ALL ON SCHEMA internal FROM PUBLIC;
REVOKE ALL ON SCHEMA internal FROM anon, authenticated;

CREATE OR REPLACE FUNCTION internal.list_auth_sessions(p_auth_user_id uuid)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  refreshed_at timestamptz,
  user_agent text,
  ip text,
  aal text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, auth, pg_temp
AS $$
  SELECT
    s.id,
    s.created_at,
    s.updated_at,
    s.refreshed_at::timestamptz,
    s.user_agent,
    host(s.ip),
    s.aal::text
  FROM auth.sessions s
  WHERE s.user_id = p_auth_user_id
  ORDER BY s.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION internal.revoke_auth_sessions(
  p_auth_user_id uuid,
  p_session_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, auth, pg_temp
AS $$
DECLARE
  n integer := 0;
BEGIN
  IF p_auth_user_id IS NULL THEN
    RETURN 0;
  END IF;

  IF p_session_id IS NOT NULL THEN
    DELETE FROM auth.refresh_tokens rt
    WHERE rt.session_id = p_session_id
      AND rt.user_id = p_auth_user_id::text;
    DELETE FROM auth.sessions s
    WHERE s.id = p_session_id
      AND s.user_id = p_auth_user_id;
  ELSE
    DELETE FROM auth.refresh_tokens rt
    WHERE rt.user_id = p_auth_user_id::text;
    DELETE FROM auth.sessions s
    WHERE s.user_id = p_auth_user_id;
  END IF;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION internal.list_auth_sessions(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION internal.revoke_auth_sessions(uuid, uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.sa_list_auth_sessions(p_auth_user_id uuid)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  refreshed_at timestamptz,
  user_agent text,
  ip text,
  aal text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, internal, pg_temp
AS $$
  SELECT * FROM internal.list_auth_sessions(p_auth_user_id);
$$;

CREATE OR REPLACE FUNCTION public.sa_revoke_auth_sessions(
  p_auth_user_id uuid,
  p_session_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, internal, pg_temp
AS $$
  SELECT internal.revoke_auth_sessions(p_auth_user_id, p_session_id);
$$;

REVOKE ALL ON FUNCTION public.sa_list_auth_sessions(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sa_list_auth_sessions(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sa_list_auth_sessions(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.sa_revoke_auth_sessions(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sa_revoke_auth_sessions(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sa_revoke_auth_sessions(uuid, uuid) TO service_role;

CREATE INDEX IF NOT EXISTS impersonation_sessions_open_started_idx
  ON public.impersonation_sessions (started_at DESC)
  WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS impersonation_sessions_started_idx
  ON public.impersonation_sessions (started_at DESC);
