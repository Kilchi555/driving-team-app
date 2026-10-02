-- Atomic primary-admin transfer.
-- Only this function may flip the two is_primary_admin flags.
-- A single UPDATE avoids an intermediate state with two active primaries.
-- On any error the transaction rolls back and the previous primary remains.
-- Do not apply to production until this change is reviewed.

BEGIN;

CREATE OR REPLACE FUNCTION public.transfer_primary_admin(
  p_caller_user_id uuid,
  p_target_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_caller public.users%ROWTYPE;
  v_target public.users%ROWTYPE;
  v_active_primaries integer;
BEGIN
  IF p_caller_user_id IS NULL OR p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'caller and target are required' USING ERRCODE = '22023';
  END IF;

  PERFORM id
  FROM public.users
  WHERE id = p_caller_user_id OR id = p_target_user_id
  ORDER BY id
  FOR UPDATE;

  SELECT * INTO v_caller FROM public.users WHERE id = p_caller_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'caller is not an active primary admin' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_target FROM public.users WHERE id = p_target_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'target is not an active login-capable admin' USING ERRCODE = '42501';
  END IF;

  IF v_caller.role IS DISTINCT FROM 'admin'
     OR v_caller.is_primary_admin IS NOT TRUE
     OR v_caller.is_active IS NOT TRUE
     OR v_caller.deleted_at IS NOT NULL
  THEN
    RAISE EXCEPTION 'caller is not an active primary admin' USING ERRCODE = '42501';
  END IF;

  IF v_caller.tenant_id IS NULL OR v_caller.tenant_id IS DISTINCT FROM v_target.tenant_id THEN
    RAISE EXCEPTION 'caller and target must belong to the same tenant' USING ERRCODE = '42501';
  END IF;

  IF v_target.role IS DISTINCT FROM 'admin'
     OR v_target.is_active IS NOT TRUE
     OR v_target.deleted_at IS NOT NULL
     OR v_target.auth_user_id IS NULL
  THEN
    RAISE EXCEPTION 'target is not an active login-capable admin' USING ERRCODE = '42501';
  END IF;

  IF v_caller.id = v_target.id THEN
    RETURN;
  END IF;

  UPDATE public.users
  SET is_primary_admin = CASE
    WHEN id = p_target_user_id THEN true
    WHEN id = p_caller_user_id THEN false
    ELSE is_primary_admin
  END
  WHERE id IN (p_caller_user_id, p_target_user_id)
    AND tenant_id = v_caller.tenant_id;

  SELECT count(*) INTO v_active_primaries
  FROM public.users
  WHERE tenant_id = v_caller.tenant_id
    AND is_primary_admin = true
    AND is_active = true
    AND deleted_at IS NULL;

  IF v_active_primaries <> 1 THEN
    RAISE EXCEPTION 'primary admin invariant violated' USING ERRCODE = '23514';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.transfer_primary_admin(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transfer_primary_admin(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_primary_admin(uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.transfer_primary_admin(uuid, uuid) IS
  'Atomically moves is_primary_admin from the active caller primary to another active login-capable admin in the same tenant.';

COMMIT;
