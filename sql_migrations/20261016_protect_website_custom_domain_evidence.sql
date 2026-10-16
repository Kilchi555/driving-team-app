-- UNAPPLIED PLAN. Do not run this against staging or production from PR 458.
-- Human gate: RLS and grants. Live policies and grants were not changed.
--
-- Why a trigger, not a column GRANT:
-- Repository migrations do not record GRANT statements for website_tenants.
-- If a table-level UPDATE grant exists for authenticated (the Supabase Data API
-- default), REVOKE UPDATE (column) does not remove it. Postgres allows the
-- column update when either the table privilege or the column privilege is held.
-- Revoking table UPDATE and re-granting every other column would also break the
-- tenant UI update of website_status in pages/tenant-admin/websites/[id].vue.
--
-- This trigger rejects changes to the server-managed evidence columns when the
-- request JWT role is anon or authenticated. A staff/admin update of other
-- columns still passes. Service-role writes used by claim, verify, and delete
-- are not those two roles.
--
-- getSupabaseAdmin() may use either a service-role JWT or a new sb_secret key
-- sent only as apikey. Whether that key sets request.jwt.claim.role to
-- service_role was not read from Production. The trigger therefore does not
-- require the claim to equal service_role. A request with no role claim is not
-- blocked here. Tenant Data API sessions carry role authenticated.
--
-- users.id is not compared to auth.uid() and is not changed.
-- custom_domain_verified_at is included because the same server handlers write
-- it and it is verification state. The routing predicate does not read it.

CREATE OR REPLACE FUNCTION public.protect_website_custom_domain_evidence()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  jwt_role text := nullif(current_setting('request.jwt.claim.role', true), '');
BEGIN
  IF jwt_role IS NULL OR jwt_role NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.custom_domain_verification IS NOT NULL
       OR NEW.custom_domain_verified IS TRUE
       OR COALESCE(NEW.custom_domain_status, '') <> ''
       OR NEW.custom_domain_verified_at IS NOT NULL
    THEN
      RAISE EXCEPTION 'custom domain verification fields are server-managed'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.custom_domain_verification IS DISTINCT FROM OLD.custom_domain_verification
     OR NEW.custom_domain_verified IS DISTINCT FROM OLD.custom_domain_verified
     OR NEW.custom_domain_status IS DISTINCT FROM OLD.custom_domain_status
     OR NEW.custom_domain_verified_at IS DISTINCT FROM OLD.custom_domain_verified_at
  THEN
    RAISE EXCEPTION 'custom domain verification fields are server-managed'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS website_tenants_protect_custom_domain_evidence ON public.website_tenants;

CREATE TRIGGER website_tenants_protect_custom_domain_evidence
  BEFORE INSERT OR UPDATE ON public.website_tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_website_custom_domain_evidence();
