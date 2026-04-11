-- Supabase Linter 0024 (rls_policy_always_true): Policies ohne reines "true" wo möglich
--
-- Strategie:
-- 1) Policies, die nur "Service Role erlaubt alles" simulieren (USING/WITH CHECK true):
--    ENTFERNEN — Rolle service_role umgeht RLS ohnehin; die Policies triggern nur den Linter.
-- 2) Öffentliche/anon INSERTs: WITH CHECK auf gültigen Tenant + Mindestfelder statt true.
-- 3) discounts / locations: Tenant- bzw. Rollenlogik statt blanket true.
--
-- Hinweis: vulnerable_postgres_version → Upgrade nur im Supabase-Dashboard.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Redundante "service role = alles true"-Policies entfernen
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow service role full access" ON public.availability_recalc_queue;

DROP POLICY IF EXISTS "service_role_insert_login_attempts" ON public.login_attempts;

DROP POLICY IF EXISTS "service_role_manage_backup_codes" ON public.mfa_backup_codes;
DROP POLICY IF EXISTS "service_role_manage_failed_attempts" ON public.mfa_failed_attempts;
DROP POLICY IF EXISTS "service_role_manage_login_codes" ON public.mfa_login_codes;
DROP POLICY IF EXISTS "service_role_manage_sms_codes" ON public.mfa_sms_codes;
DROP POLICY IF EXISTS "service_role_log_verifications" ON public.mfa_verifications;

DROP POLICY IF EXISTS "Service role full access" ON public.page_analytics;
DROP POLICY IF EXISTS "Service role can insert reminders" ON public.payment_reminders;
DROP POLICY IF EXISTS "service_role_all_quotes" ON public.pending_quotes;
DROP POLICY IF EXISTS "Service role can insert price leads" ON public.price_calculation_leads;
DROP POLICY IF EXISTS "Service role can insert rate limit logs" ON public.rate_limit_logs;
DROP POLICY IF EXISTS "Service role can insert SARI sync logs" ON public.sari_sync_logs;
DROP POLICY IF EXISTS "Service role full access" ON public.staff_locations;
DROP POLICY IF EXISTS "service_role_all_redemptions" ON public.voucher_redemptions;

DROP POLICY IF EXISTS "Service role can manage all errors" ON public.error_logs;

-- ---------------------------------------------------------------------------
-- 2) appointment_preferences — INSERT für anon/authenticated
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS appointment_preferences_public_insert ON public.appointment_preferences;

CREATE POLICY appointment_preferences_public_insert ON public.appointment_preferences
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    tenant_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = appointment_preferences.tenant_id)
    AND (status IS NULL OR status::text = ANY (ARRAY['pending', 'contacted', 'scheduled', 'expired']))
  );

-- ---------------------------------------------------------------------------
-- 3) availability_slots — anon UPDATE (WITH CHECK nicht literal TRUE)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "update_available_slots" ON public.availability_slots;

CREATE POLICY "update_available_slots" ON public.availability_slots
  FOR UPDATE
  TO anon
  USING (reserved_by_session IS NULL OR reserved_until < now())
  WITH CHECK (
    tenant_id IS NOT NULL
    AND staff_id IS NOT NULL
    AND (
      (reserved_until IS NULL AND reserved_by_session IS NULL)
      OR (reserved_until IS NOT NULL AND reserved_by_session IS NOT NULL)
    )
  );

-- ---------------------------------------------------------------------------
-- 4) booking_proposals — anon INSERT
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS anon_insert_booking_proposals ON public.booking_proposals;

CREATE POLICY anon_insert_booking_proposals ON public.booking_proposals
  FOR INSERT
  WITH CHECK (
    tenant_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = booking_proposals.tenant_id)
    AND preferred_time_slots IS NOT NULL
  );

-- ---------------------------------------------------------------------------
-- 5) course_leads — anon INSERT (Website-Leads)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS anon_insert_course_leads ON public.course_leads;

CREATE POLICY anon_insert_course_leads ON public.course_leads
  FOR INSERT
  WITH CHECK (
    tenant_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = course_leads.tenant_id)
    AND length(trim(first_name)) > 0
    AND length(trim(last_name)) > 0
  );

-- ---------------------------------------------------------------------------
-- 6) discounts — authenticated CRUD nur im eigenen Tenant
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS discounts_allow_authenticated_delete ON public.discounts;
DROP POLICY IF EXISTS discounts_allow_authenticated_insert ON public.discounts;
DROP POLICY IF EXISTS discounts_allow_authenticated_update ON public.discounts;
DROP POLICY IF EXISTS discounts_insert_auth ON public.discounts;

CREATE POLICY discounts_allow_authenticated_insert ON public.discounts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = auth.uid() AND u.role = 'super_admin')
      OR EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_user_id = auth.uid()
          AND u.tenant_id = discounts.tenant_id
      )
    )
  );

CREATE POLICY discounts_allow_authenticated_update ON public.discounts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = auth.uid() AND u.role = 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.tenant_id = discounts.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = auth.uid() AND u.role = 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.tenant_id = discounts.tenant_id
    )
  );

CREATE POLICY discounts_allow_authenticated_delete ON public.discounts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = auth.uid() AND u.role = 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.tenant_id = discounts.tenant_id
    )
  );

-- ---------------------------------------------------------------------------
-- 7) error_logs — anon / authenticated INSERT
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS anon_insert_errors ON public.error_logs;
DROP POLICY IF EXISTS authenticated_insert_errors ON public.error_logs;

CREATE POLICY anon_insert_errors ON public.error_logs
  FOR INSERT
  TO anon
  WITH CHECK (
    coalesce(trim(message), '') <> ''
    OR coalesce(trim(component), '') <> ''
  );

CREATE POLICY authenticated_insert_errors ON public.error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    coalesce(trim(message), '') <> ''
    OR coalesce(trim(component), '') <> ''
  );

-- ---------------------------------------------------------------------------
-- 8) locations — UPDATE: USING nicht mehr trivial true
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS locations_update ON public.locations;

CREATE POLICY locations_update ON public.locations
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('admin', 'tenant_admin', 'staff')
    OR (location_type::text = 'pickup' AND user_id = auth.uid())
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') IN ('admin', 'tenant_admin', 'staff')
    OR (location_type::text = 'pickup' AND user_id = auth.uid())
  );

COMMIT;
