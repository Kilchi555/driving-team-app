-- SEC-C01 extension.
-- Freeze additional self-update columns for anon/authenticated clients:
--   is_primary_admin, auth_user_id, is_active, deleted_at
-- Existing freeze of role, tenant_id, admin_level stays in force.
-- Service-role application writes remain allowed.
-- Historical migration 20260903_sec_c01_users_privilege_freeze.sql is not modified.
-- Do not apply to production until this change is reviewed.

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
     OR NEW.is_primary_admin IS DISTINCT FROM OLD.is_primary_admin
     OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
  THEN
    RAISE EXCEPTION 'Updating role, tenant_id, admin_level, is_primary_admin, auth_user_id, is_active, or deleted_at via client is not allowed'
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

REVOKE UPDATE (role, tenant_id, admin_level) ON TABLE public.users FROM PUBLIC;
REVOKE UPDATE (role, tenant_id, admin_level) ON TABLE public.users FROM anon;
REVOKE UPDATE (role, tenant_id, admin_level) ON TABLE public.users FROM authenticated;

REVOKE UPDATE (is_primary_admin, auth_user_id, is_active, deleted_at) ON TABLE public.users FROM PUBLIC;
REVOKE UPDATE (is_primary_admin, auth_user_id, is_active, deleted_at) ON TABLE public.users FROM anon;
REVOKE UPDATE (is_primary_admin, auth_user_id, is_active, deleted_at) ON TABLE public.users FROM authenticated;

COMMENT ON FUNCTION public.prevent_users_privilege_escalation() IS
  'SEC-C01 extension (2026-10-02): block client writes to users.role|tenant_id|admin_level|is_primary_admin|auth_user_id|is_active|deleted_at; service_role and non-JWT SQL allowed.';

COMMIT;
