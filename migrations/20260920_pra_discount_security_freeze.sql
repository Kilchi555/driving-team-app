-- PR-A DISCOUNT SECURITY FREEZE — 2026-09-20
-- From current origin/main. Isolated security branch only.
-- Create only. Do not apply automatically to production.
--
-- C1: Clients (anon / authenticated / PUBLIC) must not mutate
--     discounts.usage_count or voucher_codes.current_redemptions.
-- Service-role Data API and non-JWT SQL (migrations / console) stay allowed.
--
-- Does NOT introduce a usage ledger or reservation state machine.
-- Does NOT change payment fulfillment writers (they use service_role).
--
-- Pattern matches SEC-C01 (20260903_sec_c01_users_privilege_freeze.sql):
--   SECURITY DEFINER must NOT trust current_user (always function owner).
--   Allow only service_role JWT, or SQL sessions with no JWT context.

BEGIN;

CREATE OR REPLACE FUNCTION public.prevent_discounts_usage_count_client_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  jwt_role text := coalesce(auth.role(), '');
  jwt_claim_role text := nullif(current_setting('request.jwt.claim.role', true), '');
  jwt_claims text := nullif(current_setting('request.jwt.claims', true), '');
  is_service boolean := jwt_role = 'service_role' OR jwt_claim_role = 'service_role';
  no_jwt boolean := jwt_claim_role IS NULL AND jwt_claims IS NULL AND jwt_role = '';
BEGIN
  IF is_service OR no_jwt THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.usage_count := 0;
    RETURN NEW;
  END IF;

  IF NEW.usage_count IS DISTINCT FROM OLD.usage_count THEN
    RAISE EXCEPTION 'Updating usage_count via client is not allowed'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_discounts_usage_count_client_mutation ON public.discounts;
CREATE TRIGGER trg_prevent_discounts_usage_count_client_mutation
  BEFORE INSERT OR UPDATE ON public.discounts
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_discounts_usage_count_client_mutation();

CREATE OR REPLACE FUNCTION public.prevent_voucher_codes_redemptions_client_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  jwt_role text := coalesce(auth.role(), '');
  jwt_claim_role text := nullif(current_setting('request.jwt.claim.role', true), '');
  jwt_claims text := nullif(current_setting('request.jwt.claims', true), '');
  is_service boolean := jwt_role = 'service_role' OR jwt_claim_role = 'service_role';
  no_jwt boolean := jwt_claim_role IS NULL AND jwt_claims IS NULL AND jwt_role = '';
BEGIN
  IF is_service OR no_jwt THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.current_redemptions := 0;
    RETURN NEW;
  END IF;

  IF NEW.current_redemptions IS DISTINCT FROM OLD.current_redemptions THEN
    RAISE EXCEPTION 'Updating current_redemptions via client is not allowed'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_voucher_codes_redemptions_client_mutation ON public.voucher_codes;
CREATE TRIGGER trg_prevent_voucher_codes_redemptions_client_mutation
  BEFORE INSERT OR UPDATE ON public.voucher_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_voucher_codes_redemptions_client_mutation();

-- UPDATE only: client INSERTs may still name the column (defaults / explicit 0).
-- The INSERT trigger forces counters to 0 for authenticated/anon JWTs.
REVOKE UPDATE (usage_count) ON TABLE public.discounts FROM PUBLIC;
REVOKE UPDATE (usage_count) ON TABLE public.discounts FROM anon;
REVOKE UPDATE (usage_count) ON TABLE public.discounts FROM authenticated;

REVOKE UPDATE (current_redemptions) ON TABLE public.voucher_codes FROM PUBLIC;
REVOKE UPDATE (current_redemptions) ON TABLE public.voucher_codes FROM anon;
REVOKE UPDATE (current_redemptions) ON TABLE public.voucher_codes FROM authenticated;

COMMENT ON FUNCTION public.prevent_discounts_usage_count_client_mutation() IS
  'PR-A C1 (2026-09-20): block client mutation of discounts.usage_count; service_role and non-JWT SQL allowed.';

COMMENT ON FUNCTION public.prevent_voucher_codes_redemptions_client_mutation() IS
  'PR-A C1 (2026-09-20): block client mutation of voucher_codes.current_redemptions; service_role and non-JWT SQL allowed.';

COMMIT;
