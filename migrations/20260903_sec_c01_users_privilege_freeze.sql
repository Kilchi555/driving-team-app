-- SEC-C01 — Freeze privileged users columns for Data API clients
-- Scope: ONLY role, tenant_id, admin_level self-escalation / tenant escape.
--
-- Confirmed: authenticated clients could UPDATE own users.role / tenant_id / admin_level
-- via PostgREST under policy user_update_own (auth_user_id = auth.uid() only).
--
-- Legitimate server/admin flows use the service_role key and MUST keep working.
-- There is no authenticated staff UPDATE policy on public.users in live DB —
-- privileged mutations already go through service_role APIs.
--
-- v2: SECURITY DEFINER must NOT trust current_user (always function owner).
--     Allow only service_role JWT, or SQL sessions with no JWT context.

BEGIN;

CREATE OR REPLACE FUNCTION public.prevent_users_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  jwt_role text := coalesce(auth.role(), '');
  jwt_claim_role text := nullif(current_setting('request.jwt.claim.role', true), '');
  jwt_claims text := nullif(current_setting('request.jwt.claims', true), '');
BEGIN
  -- Legitimate server/admin Data API calls (service_role key)
  IF jwt_role = 'service_role' OR jwt_claim_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- No JWT context at all → SQL console / migrations (not a PostgREST client)
  IF jwt_claim_role IS NULL AND jwt_claims IS NULL AND jwt_role = '' THEN
    RETURN NEW;
  END IF;

  -- Authenticated/anon Data API clients cannot change privileged columns
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.admin_level IS DISTINCT FROM OLD.admin_level
  THEN
    RAISE EXCEPTION 'Updating role, tenant_id, or admin_level via client is not allowed'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_users_privilege_escalation ON public.users;
CREATE TRIGGER trg_prevent_users_privilege_escalation
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_users_privilege_escalation();

-- Defense in depth: column privileges (service_role retains full UPDATE via its grants)
REVOKE UPDATE (role, tenant_id, admin_level) ON TABLE public.users FROM PUBLIC;
REVOKE UPDATE (role, tenant_id, admin_level) ON TABLE public.users FROM anon;
REVOKE UPDATE (role, tenant_id, admin_level) ON TABLE public.users FROM authenticated;

COMMENT ON FUNCTION public.prevent_users_privilege_escalation() IS
  'SEC-C01 (2026-09-03): block client privilege escalation / tenant escape on users.role|tenant_id|admin_level; service_role and non-JWT SQL allowed.';

COMMIT;
