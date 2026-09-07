-- P0 incident containment — 2026-09-07
-- Create only. Do not apply automatically to production.
-- Idempotent: DROP POLICY IF EXISTS + CREATE OR REPLACE + REVOKE/GRANT.
-- Does not delete rows, invitations, storage objects, or credentials.
--
-- Closes:
--   F-1 staff_invitations anon SELECT of invitation_token
--   F-2 anon + ordinary-authenticated read of tenant banking / payment secrets
--   F-4 users.is_active self-reactivation via Data API
--   F-5 tenant-logos INSERT without service_role check
--   F-6 anon enumeration of voucher rows + customer/anon write of discounts
--   F-7 cross-tenant locations INSERT/UPDATE/DELETE + public exposure of
--       customer pickup (home address) rows
--   F-3 (partial) anon DML on the incident tables only
--
-- Does NOT revoke anon DML on 197 public tables. Public booking still
-- needs Data-API writes on availability_slots, booking_proposals,
-- course_waitlist, course_leads, error_logs, invited_customers,
-- appointment_preferences. Full least-privilege is a follow-up.
--
-- ============================================================================
-- ROLLBACK — full prior state, captured from the live catalog on 2026-09-07.
-- Re-running this block restores the pre-migration behaviour exactly (and
-- re-opens the incident, so it is for emergency use only).
--
-- GRANT ALL ON TABLE public.staff_invitations TO anon;
-- GRANT ALL ON TABLE public.discounts TO anon;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tenants TO anon;
-- GRANT SELECT ON TABLE public.tenants TO authenticated;
-- GRANT INSERT, UPDATE, DELETE ON TABLE public.locations TO anon;
-- GRANT INSERT, UPDATE, DELETE ON TABLE public.users TO anon;
-- GRANT INSERT, UPDATE, DELETE ON TABLE public.payments, public.invoices,
--   public.invoice_items, public.product_sales, public.appointments TO anon;
--
-- CREATE POLICY "staff_invitations_token_read" ON public.staff_invitations
--   FOR SELECT TO anon USING (status = 'pending' AND expires_at > now());
-- CREATE POLICY "Allow public access to active tenants" ON public.tenants
--   FOR SELECT TO public USING (is_active = true);
-- CREATE POLICY "tenants_simple_access" ON public.tenants
--   FOR SELECT TO authenticated USING (is_active = true);
-- CREATE POLICY "anon_read_locations" ON public.locations
--   FOR SELECT TO public USING (true);
-- CREATE POLICY "locations_select" ON public.locations
--   FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "locations_select_policy" ON public.locations
--   FOR SELECT TO public USING (
--     tenant_id IS NULL OR tenant_id IN (
--       SELECT users.tenant_id FROM users
--       WHERE users.auth_user_id = auth.uid() AND users.is_active = true));
-- CREATE POLICY "locations_insert" ON public.locations
--   FOR INSERT TO authenticated WITH CHECK (location_type::text = 'pickup');
-- CREATE POLICY "locations_insert_policy" ON public.locations
--   FOR INSERT TO public WITH CHECK (auth.uid() IN (
--     SELECT users.auth_user_id FROM users
--     WHERE users.role = ANY (ARRAY['admin','tenant_admin']) AND users.is_active = true));
-- CREATE POLICY "authenticated_insert_locations" ON public.locations
--   FOR INSERT TO authenticated WITH CHECK (EXISTS (
--     SELECT 1 FROM users u WHERE u.auth_user_id = auth.uid()
--       AND u.tenant_id = locations.tenant_id
--       AND u.role = ANY (ARRAY['admin','tenant_admin','staff'])));
-- CREATE POLICY "locations_update" ON public.locations
--   FOR UPDATE TO authenticated USING (
--     (auth.jwt() ->> 'role') = ANY (ARRAY['admin','tenant_admin','staff'])
--     OR (location_type::text = 'pickup' AND user_id = auth.uid()))
--   WITH CHECK (same expression);
-- CREATE POLICY "locations_update_policy" ON public.locations
--   FOR UPDATE TO public USING (auth.uid() IN (
--     SELECT users.auth_user_id FROM users WHERE
--       (users.role = ANY (ARRAY['admin','tenant_admin','staff']) AND users.is_active = true
--        AND users.tenant_id = locations.tenant_id)
--       OR (users.role = ANY (ARRAY['admin','tenant_admin']) AND users.is_active = true)))
--   WITH CHECK (same expression);
-- CREATE POLICY "authenticated_update_locations" ON public.locations
--   FOR UPDATE TO authenticated USING (EXISTS (
--     SELECT 1 FROM users u WHERE u.auth_user_id = auth.uid()
--       AND u.tenant_id = locations.tenant_id
--       AND u.role = ANY (ARRAY['admin','tenant_admin','staff'])))
--   WITH CHECK (same expression);
-- CREATE POLICY "locations_delete" ON public.locations
--   FOR DELETE TO authenticated USING (
--     (auth.jwt() ->> 'role') = ANY (ARRAY['admin','tenant_admin','staff']));
-- CREATE POLICY "locations_delete_policy" ON public.locations
--   FOR DELETE TO public USING (auth.uid() IN (
--     SELECT users.auth_user_id FROM users
--     WHERE users.role = ANY (ARRAY['admin','tenant_admin']) AND users.is_active = true));
-- CREATE POLICY "authenticated_delete_locations" ON public.locations
--   FOR DELETE TO authenticated USING (EXISTS (
--     SELECT 1 FROM users u WHERE u.auth_user_id = auth.uid()
--       AND u.tenant_id = locations.tenant_id
--       AND u.role = ANY (ARRAY['admin','tenant_admin'])));
-- CREATE POLICY "discounts_select_anon" ON public.discounts
--   FOR SELECT TO anon USING (is_voucher = true);
--   NOTE: this policy has no migration of origin anywhere in the repository —
--   it was applied straight to production, so the live catalog was its only
--   record. Same for staff_invitations_token_read and the locations_*_policy
--   trio. Treat the definitions in this rollback block as the source of truth.
-- CREATE POLICY "discounts_select_tenant" ON public.discounts
--   FOR SELECT TO authenticated USING (EXISTS (
--     SELECT 1 FROM users u WHERE u.auth_user_id = auth.uid()
--       AND (u.role = 'super_admin' OR u.tenant_id = discounts.tenant_id)));
-- CREATE POLICY "discounts_insert_anon" ON public.discounts
--   FOR INSERT TO anon WITH CHECK (is_voucher = true AND payment_id IS NOT NULL);
-- CREATE POLICY "discounts_allow_authenticated_insert" ON public.discounts
--   FOR INSERT TO authenticated WITH CHECK (tenant_id IS NOT NULL AND (
--     EXISTS (SELECT 1 FROM users u WHERE u.auth_user_id = auth.uid() AND u.role = 'super_admin')
--     OR EXISTS (SELECT 1 FROM users u WHERE u.auth_user_id = auth.uid()
--                AND u.tenant_id = discounts.tenant_id)));
-- CREATE POLICY "discounts_allow_authenticated_update" ON public.discounts
--   FOR UPDATE TO authenticated USING (<same OR-pair without tenant_id NOT NULL>)
--   WITH CHECK (same expression);
-- CREATE POLICY "discounts_allow_authenticated_delete" ON public.discounts
--   FOR DELETE TO authenticated USING (<same OR-pair>);
-- CREATE POLICY "Service role upload tenant-logos" ON storage.objects
--   FOR INSERT TO public WITH CHECK (bucket_id = 'tenant-logos');
--
-- prevent_users_privilege_escalation(): previous body checked only
--   role / tenant_id / admin_level (no is_active, no auth_user_id).
--
-- Code-side rollback: restore select('*') in pages/shop.vue,
--   pages/tenant-admin/index.vue and server/api/booking/get-availability.post.ts.
-- ============================================================================

-- ============================================================================
-- F-1 — staff invitation tokens are not publicly enumerable
-- Public registration UX uses POST /api/staff/get-invitation (service_role,
-- equality lookup on the caller-supplied token).
-- ============================================================================

ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_invitations_token_read" ON public.staff_invitations;

REVOKE ALL ON TABLE public.staff_invitations FROM anon;
REVOKE ALL ON TABLE public.staff_invitations FROM PUBLIC;

-- ============================================================================
-- F-2 — tenant secrets are not PostgREST-readable by anon or by an ordinary
-- authenticated user.
--
-- PostgreSQL semantics (this is the bug in the first version of this file):
-- a table-level GRANT SELECT implicitly covers every column, and a
-- column-level REVOKE cannot subtract from it — Postgres answers
-- "no privileges could be revoked for column ..." and changes nothing.
-- Column privileges only take effect once the table-level SELECT is gone.
-- So the only correct shape is REVOKE SELECT on the table, then GRANT SELECT
-- on an explicit column allowlist. Same pattern as
-- 20260904_wave1c_least_privilege_grants.sql.
--
-- The security boundary for F-2 is therefore the COLUMN layer, not the row
-- layer. Row visibility is deliberately left as it is today (any active
-- tenant, readable by anon and authenticated) because public landing pages,
-- the registration tenant picker and the platform console all legitimately
-- read foreign tenant rows. Narrowing rows would have broken those flows
-- without protecting a single secret.
--
-- The allowlists below are derived from the actual `.from('tenants')` reads in
-- pages/ components/ composables/ stores/ plugins/ middleware/ layouts/ utils/.
-- They are fail-closed: a newly added column is NOT readable by anon or
-- authenticated until it is added here on purpose.
--
-- Verified dependencies (live catalog, 2026-09-07):
--  * RLS policies on other tables that subquery tenants reference only
--    tenants.id and tenants.is_active — appointment_preferences_public_insert,
--    availability_slots.select_available_slots_for_listing,
--    booking_proposals.anon_insert_booking_proposals,
--    course_leads.anon_insert_course_leads, invited_customers_anon_insert.
--    Both columns stay granted, so public booking writes keep evaluating.
--  * Only one view depends on tenants: public.sari_sync_status
--    (security_invoker=on, so it is not a privilege-escalation bypass). It
--    selects sari_enabled / sari_environment / sari_last_sync_at, which are
--    deliberately NOT granted. No application code queries that view, so this
--    is accepted rather than widening the allowlist.
-- ============================================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access to active tenants" ON public.tenants;
DROP POLICY IF EXISTS "tenants_simple_access" ON public.tenants;
DROP POLICY IF EXISTS "tenants_anon_select_active" ON public.tenants;
DROP POLICY IF EXISTS "tenants_authenticated_own_or_superadmin" ON public.tenants;
DROP POLICY IF EXISTS "tenants_authenticated_select_active" ON public.tenants;

CREATE POLICY "tenants_anon_select_active"
ON public.tenants
FOR SELECT
TO anon
USING (is_active = true);

CREATE POLICY "tenants_authenticated_select_active"
ON public.tenants
FOR SELECT
TO authenticated
USING (is_active = true);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.tenants FROM anon;

-- Drop the table-wide SELECT first; without this every GRANT below is cosmetic.
REVOKE SELECT ON TABLE public.tenants FROM anon, authenticated;
REVOKE SELECT ON TABLE public.tenants FROM PUBLIC;

-- anon: public brand identity and published business contact data only.
-- Read by pages/payment/success.vue (primary_color, logo_url),
-- pages/register/index.vue (tenant picker), components/CategorySelector.vue
-- (business_type), utils/reglementPlaceholders.ts (address/contact/website).
GRANT SELECT (
  id,
  name,
  slug,
  domain,
  business_type,
  is_active,
  is_trial,
  contact_email,
  contact_phone,
  address,
  website_url,
  logo_url,
  logo_square_url,
  logo_wide_url,
  logo_dark_url,
  favicon_url,
  primary_color,
  secondary_color,
  accent_color,
  brand_name,
  brand_tagline,
  brand_description,
  website_only,
  timezone,
  currency,
  language
) ON public.tenants TO anon;

-- authenticated: the anon allowlist plus the non-secret operational columns
-- that authenticated UI actually reads — composables/useTrialFeatures.ts
-- (is_trial/trial_ends_at/subscription_plan/current_period_end),
-- pages/admin/users/index.vue + pages/admin/privatkunden.vue (subscription_plan,
-- addon_seats), composables/useCourseParticipants.ts (twilio_from_sender),
-- pages/tenant-admin/index.vue and pages/tenant-admin/websites/index.vue
-- (website_*, wallee_onboarding_status, created_at).
-- Banking, Wallee/Stripe identifiers, accounting inbox token, unit economics,
-- license/UID numbers and mail/analytics credentials are intentionally absent:
-- they stay service_role only and are served by the admin server APIs.
GRANT SELECT (
  id,
  name,
  slug,
  domain,
  business_type,
  is_active,
  is_trial,
  contact_email,
  contact_phone,
  address,
  website_url,
  logo_url,
  logo_square_url,
  logo_wide_url,
  logo_dark_url,
  favicon_url,
  primary_color,
  secondary_color,
  accent_color,
  brand_name,
  brand_tagline,
  brand_description,
  website_only,
  timezone,
  currency,
  language,
  created_at,
  trial_ends_at,
  subscription_plan,
  current_period_end,
  addon_seats,
  twilio_from_sender,
  website_status,
  website_domain,
  website_approved_at,
  website_notes,
  website_hosting_plan,
  wallee_onboarding_status
) ON public.tenants TO authenticated;

-- ============================================================================
-- F-4 — client Data API cannot flip is_active (or auth_user_id)
-- service_role and SQL-console (no JWT) still can, for admin APIs.
-- ============================================================================

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
  IF jwt_role = 'service_role' OR jwt_claim_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF jwt_claim_role IS NULL AND jwt_claims IS NULL AND jwt_role = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.admin_level IS DISTINCT FROM OLD.admin_level
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id
  THEN
    RAISE EXCEPTION 'Updating privileged user columns via client is not allowed'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.prevent_users_privilege_escalation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_users_privilege_escalation() FROM anon, authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.users FROM anon;

-- ============================================================================
-- F-5 — tenant-logos uploads are service_role only
-- Legitimate uploads go through /api/tenant/upload-logo and website media APIs.
-- ============================================================================

DROP POLICY IF EXISTS "Service role upload tenant-logos" ON storage.objects;

CREATE POLICY "Service role upload tenant-logos"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  (bucket_id = 'tenant-logos'::text)
  AND (auth.role() = 'service_role'::text)
);

-- ============================================================================
-- F-6 — discounts: no anon access at all; writes are staff/admin in the
-- caller's own tenant.
--
-- The anon INSERT was only half the exposure. discounts_select_anon
-- (USING (is_voucher = true)) let an unauthenticated caller enumerate every
-- voucher in every tenant — code, remaining_amount_rappen and
-- voucher_recipient_email — i.e. free-money plus PII. It is dropped, and anon
-- loses the table privilege entirely.
--
-- This restores the architecture that migrations/add_anon_rls_for_vouchers.sql
-- already documented as intended: "No voucher codes are ever exposed via direct
-- PostgREST/anon access ... All anon operations go through API endpoints that
-- use getSupabaseAdmin()". Guest voucher lookup/redemption therefore keeps
-- working via /api/vouchers/lookup and /api/vouchers/redeem (service_role),
-- and voucher issuance via /api/vouchers/create-after-purchase (service_role).
-- No server route that touches `discounts` uses the anon key.
--
-- super_admin keeps a deliberate cross-tenant branch below: it is the platform
-- operator role (pages/tenant-admin/**, gated by role = 'super_admin'), not a
-- tenant role. Everyone else is strictly confined to u.tenant_id.
-- ============================================================================

DROP POLICY IF EXISTS "discounts_select_anon" ON public.discounts;
DROP POLICY IF EXISTS "discounts_insert_anon" ON public.discounts;
DROP POLICY IF EXISTS "discounts_allow_authenticated_insert" ON public.discounts;
DROP POLICY IF EXISTS "discounts_allow_authenticated_update" ON public.discounts;
DROP POLICY IF EXISTS "discounts_allow_authenticated_delete" ON public.discounts;
DROP POLICY IF EXISTS "discounts_write_staff_insert" ON public.discounts;
DROP POLICY IF EXISTS "discounts_write_staff_update" ON public.discounts;
DROP POLICY IF EXISTS "discounts_write_staff_delete" ON public.discounts;

CREATE POLICY "discounts_write_staff_insert"
ON public.discounts
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.is_active = true
      AND u.role = ANY (ARRAY['admin'::text, 'staff'::text, 'tenant_admin'::text, 'super_admin'::text])
      AND (u.role = 'super_admin'::text OR u.tenant_id = discounts.tenant_id)
  )
);

CREATE POLICY "discounts_write_staff_update"
ON public.discounts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.is_active = true
      AND u.role = ANY (ARRAY['admin'::text, 'staff'::text, 'tenant_admin'::text, 'super_admin'::text])
      AND (u.role = 'super_admin'::text OR u.tenant_id = discounts.tenant_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.is_active = true
      AND u.role = ANY (ARRAY['admin'::text, 'staff'::text, 'tenant_admin'::text, 'super_admin'::text])
      AND (u.role = 'super_admin'::text OR u.tenant_id = discounts.tenant_id)
  )
);

CREATE POLICY "discounts_write_staff_delete"
ON public.discounts
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.is_active = true
      AND u.role = ANY (ARRAY['admin'::text, 'staff'::text, 'tenant_admin'::text, 'super_admin'::text])
      AND (u.role = 'super_admin'::text OR u.tenant_id = discounts.tenant_id)
  )
);

-- The surviving read policy had no is_active check, so a deactivated staff
-- member kept reading their tenant's discount codes. Align it with the write
-- policies and with F-4.
DROP POLICY IF EXISTS "discounts_select_tenant" ON public.discounts;

CREATE POLICY "discounts_select_tenant"
ON public.discounts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.is_active = true
      AND (u.role = 'super_admin'::text OR u.tenant_id = discounts.tenant_id)
  )
);

REVOKE ALL ON TABLE public.discounts FROM anon;

-- ============================================================================
-- F-7 — locations: every write is tenant-bound, and customer pickup rows are
-- not publicly enumerable.
--
-- Permissive policies are OR-ed, so dropping one weak policy is not enough:
-- locations_insert_policy / locations_update_policy / locations_delete_policy
-- each carried an admin|tenant_admin branch with NO correlation to
-- locations.tenant_id, which allowed an admin of tenant A to write into
-- tenant B. locations_update / locations_delete tested auth.jwt() ->> 'role',
-- which is the PostgREST role ('authenticated'), never an application role —
-- dead expressions, dropped rather than kept as false comfort.
--
-- Same OR-rule on SELECT: locations_select_policy is TO public (so it also
-- applies to anon) with USING (tenant_id IS NULL OR own-tenant). Combined
-- with the narrowed anon policy it re-opens every NULL-tenant row regardless
-- of location_type or is_active. Production currently has no NULL-tenant
-- pickup rows, but the invariant must be structural. Drop it and replace
-- the authenticated global-exam read with an explicit exam+active predicate.
--
-- Row shape in production (aggregate counts, 2026-09-07):
--   exam     tenant_id IS NULL      37 active  -> global reference data
--   standard tenant_id NOT NULL     51 active  -> public meeting points
--   pickup   tenant_id NOT NULL    356 active  -> CUSTOMER HOME ADDRESSES
-- anon_read_locations USING (true) exposed all 356 pickup rows (customer name
-- in `name`, home address in `address`) to unauthenticated callers.
--
-- Global exam rows (tenant_id IS NULL) are shared reference data written from
-- components/ExamLocationSelector.vue and ExamLocationSearchDropdown.vue, so
-- staff/admin keep an explicit tenant_id IS NULL + location_type='exam' branch.
-- That branch cannot be used to target another tenant's namespace.
-- ============================================================================

DROP POLICY IF EXISTS "locations_insert" ON public.locations;
DROP POLICY IF EXISTS "locations_insert_policy" ON public.locations;
DROP POLICY IF EXISTS "authenticated_insert_locations" ON public.locations;
DROP POLICY IF EXISTS "locations_insert_tenant_bound" ON public.locations;

DROP POLICY IF EXISTS "locations_update" ON public.locations;
DROP POLICY IF EXISTS "locations_update_policy" ON public.locations;
DROP POLICY IF EXISTS "authenticated_update_locations" ON public.locations;
DROP POLICY IF EXISTS "locations_update_tenant_bound" ON public.locations;

DROP POLICY IF EXISTS "locations_delete" ON public.locations;
DROP POLICY IF EXISTS "locations_delete_policy" ON public.locations;
DROP POLICY IF EXISTS "authenticated_delete_locations" ON public.locations;
DROP POLICY IF EXISTS "locations_delete_tenant_bound" ON public.locations;

DROP POLICY IF EXISTS "anon_read_locations" ON public.locations;
DROP POLICY IF EXISTS "locations_select" ON public.locations;
DROP POLICY IF EXISTS "locations_select_policy" ON public.locations;
DROP POLICY IF EXISTS "locations_anon_select_public" ON public.locations;
DROP POLICY IF EXISTS "locations_select_global_exam" ON public.locations;

-- Public booking needs active standard meeting points plus the global exam
-- list. Verified against every anon-key endpoint that serves the public booking
-- page — get-locations.get.ts, get-availability.post.ts (get-booking-setup,
-- get-staff-for-category, get-locations-for-staff), get-booking-init.get.ts and
-- submit-general-inquiry.post.ts. They filter on (tenant_id, is_active) and
-- mostly on location_type='standard'.
--
-- Two of them omit the location_type filter, so this policy narrows what they
-- see. Both are safe:
--   * get-booking-init.get.ts only counts rows into `locationsCount`, which
--     pages/booking/availability/[slug].vue assigns but never reads — it gates
--     nothing, so dropping pickup rows from the count has no visible effect.
--   * submit-general-inquiry.post.ts validates a submitted location_id; the
--     options come from get-locations.get.ts, which already returns standard
--     rows only, so legitimate inquiries still validate. Referencing a
--     customer's home address in a public inquiry now correctly fails.
-- Tightening those two queries in app code is worthwhile defence-in-depth but
-- is not required for containment and is left out of this patch on purpose.
--
-- This predicate deliberately does NOT reference public_bookable: no booking
-- endpoint filters on it (the runtime gate is staff_locations.is_online_bookable),
-- and migrations/remove_public_bookable_from_locations.sql leaves it unclear
-- whether the column survives. It still exists in production today, but this
-- policy is correct either way.
CREATE POLICY "locations_anon_select_public"
ON public.locations
FOR SELECT
TO anon
USING (
  is_active = true
  AND (
    (tenant_id IS NOT NULL AND location_type = 'standard')
    OR (tenant_id IS NULL AND location_type = 'exam')
  )
);

-- Authenticated own-tenant reads stay on authenticated_read_locations.
-- Global exam rows (tenant_id IS NULL) are not matched by that policy, so
-- they need their own authenticated SELECT. TO authenticated only — TO public
-- would OR-widen the anon predicate back to every NULL-tenant row.
CREATE POLICY "locations_select_global_exam"
ON public.locations
FOR SELECT
TO authenticated
USING (
  tenant_id IS NULL
  AND location_type = 'exam'
  AND is_active = true
);

CREATE POLICY "locations_insert_tenant_bound"
ON public.locations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.is_active = true
      AND u.role = ANY (ARRAY['admin'::text, 'tenant_admin'::text, 'staff'::text])
      AND (
        u.tenant_id = locations.tenant_id
        OR (locations.tenant_id IS NULL AND locations.location_type = 'exam')
      )
  )
);

CREATE POLICY "locations_update_tenant_bound"
ON public.locations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.is_active = true
      AND u.role = ANY (ARRAY['admin'::text, 'tenant_admin'::text, 'staff'::text])
      AND (
        u.tenant_id = locations.tenant_id
        OR (locations.tenant_id IS NULL AND locations.location_type = 'exam')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.is_active = true
      AND u.role = ANY (ARRAY['admin'::text, 'tenant_admin'::text, 'staff'::text])
      AND (
        u.tenant_id = locations.tenant_id
        OR (locations.tenant_id IS NULL AND locations.location_type = 'exam')
      )
  )
);

CREATE POLICY "locations_delete_tenant_bound"
ON public.locations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.is_active = true
      AND u.role = ANY (ARRAY['admin'::text, 'tenant_admin'::text, 'staff'::text])
      AND u.tenant_id = locations.tenant_id
  )
);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.locations FROM anon;

-- ============================================================================
-- F-3 partial — anon must not DML financial/auth tables even if a policy appears
-- ============================================================================

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.payments FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.invoices FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.invoice_items FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.product_sales FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.appointments FROM anon;

NOTIFY pgrst, 'reload schema';
