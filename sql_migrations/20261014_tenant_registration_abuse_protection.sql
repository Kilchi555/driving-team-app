-- Tenant registration abuse protection (2026-10-14)
-- Apply in staging/test first. Do NOT apply via agent to production without rollout approval.
--
-- Fixes:
-- 1) rate_limit_logs.operation CHECK rejected 'tenant_register' / 'create_admin' → silent fail-open
-- 2) atomic consume_rate_limit with transaction-scoped advisory lock
-- 3) pending email verification columns + hashed single-use token table
-- 4) atomic consume_tenant_registration_email_token for verify+activate
--
-- Rollback notes:
-- - Dropping functions / re-adding old CHECK is possible BEFORE production traffic uses new ops.
-- - After verification tokens are issued, rolling back token table / columns can strand pending signups.
-- - Re-imposing the old three-value CHECK will again break tenant_register persistence.

BEGIN;

-- ─── 1. rate_limit_logs: narrowly scoped explicit operation allowlist ────────
ALTER TABLE public.rate_limit_logs
  DROP CONSTRAINT IF EXISTS rate_limit_logs_operation_check;

ALTER TABLE public.rate_limit_logs
  ALTER COLUMN operation TYPE VARCHAR(80);

-- Explicit allowlist of known operations + prefix for dynamic SARI ops.
-- Intentionally NOT an unrestricted free-text column.
ALTER TABLE public.rate_limit_logs
  ADD CONSTRAINT rate_limit_logs_operation_check CHECK (
    (
      operation = ANY (ARRAY[
        'accountant_accept',
        'add_student',
        'adjust_credit',
        'admin_course_category_delete',
        'admin_course_category_save',
        'admin_course_create',
        'admin_course_enrollments',
        'admin_course_participants',
        'admin_course_sessions',
        'admin_courses_list',
        'admin_dashboard_revenue_12m',
        'admin_dashboard_summary',
        'admin_import_users',
        'admin_instructor_create_external',
        'admin_payment_operations',
        'admin_payments_overview',
        'admin_resources_general_save',
        'admin_room_create',
        'admin_room_delete',
        'admin_room_update',
        'admin_staff_list',
        'admin_user_details',
        'admin_user_manage',
        'admin_vehicle_create',
        'admin_vehicle_delete',
        'admin_vehicle_update',
        'affiliate_lead_submit',
        'anonymous_sale_checkout',
        'booking_inquiry',
        'booking_proposal',
        'calculate_prices',
        'cancel_customer',
        'cancel_reservation',
        'cancel_staff',
        'cash_management',
        'check_availability',
        'check_client_contact',
        'check_conflicts',
        'client_invite_resend',
        'client_invite_update',
        'complete_onboarding',
        'confirm_cash_payment',
        'confirm_payout_otp',
        'create_admin',
        'create_appointment',
        'customer_get_payment_page_data',
        'customer_reglements',
        'document_upload_onboarding',
        'email_check',
        'extract_logo_colors',
        'generate_code',
        'get_available_slots',
        'get_learning_progress',
        'get_product_sales',
        'get_slots_for_pickup',
        'get_tenant_branding_ip',
        'get_users_with_stats',
        'legacy_unscoped',
        'login',
        'onboarding_categories',
        'onboarding_reglements',
        'onboarding_terms',
        'password_reset',
        'register',
        'register_guest',
        'request_credit_withdrawal',
        'request_onboarding_link',
        'request_payout',
        'resend_onboarding_self',
        'resend_onboarding_sms',
        'resend_registration_verification',
        'reserve_slot',
        'reset_failed_payment',
        'rollback_registration',
        'sari_public_lookup',
        'save_discount',
        'send_onboarding_sms',
        'settle_and_email_payment',
        'shop_create_payment',
        'shop_find_or_create_guest_user',
        'sms_send',
        'staff_invite',
        'staff_invite_email_check',
        'staff_invite_resend',
        'staff_invite_update',
        'staff_register',
        'switch_account',
        'tenant_register',
        'tenant_register_email',
        'upcoming_course_registrations',
        'update_tenant_branding',
        'update_withdrawal_iban',
        'upload_document_registration',
        'use_credit_for_appointment',
        'verify_onboarding_token',
        'verify_registration_email',
        'voucher_lookup',
        'website_ai_optimize_ip',
        'website_faq_research_ip',
        'website_seo_advisor_ip'
      ]::text[])
    )
    OR operation LIKE 'sari_%'
  );

COMMENT ON COLUMN public.rate_limit_logs.operation IS
  'Allowlisted rate-limit operation key. Includes tenant_register/create_admin. Dynamic SARI ops use sari_% prefix.';

-- Atomic check+insert with transaction advisory lock (service_role only).
CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_operation text,
  p_ip_address text,
  p_max_requests integer,
  p_window_seconds integer,
  p_email text DEFAULT NULL,
  p_tenant_id uuid DEFAULT NULL
)
RETURNS TABLE (
  allowed boolean,
  request_count integer,
  retry_after_seconds integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz := now() - make_interval(secs => GREATEST(p_window_seconds, 1));
  v_count integer;
  v_oldest timestamptz;
  v_allowed boolean;
  v_retry integer;
  v_lock_key bigint;
BEGIN
  IF p_operation IS NULL OR length(trim(p_operation)) = 0 THEN
    RAISE EXCEPTION 'operation required';
  END IF;
  IF p_ip_address IS NULL OR length(trim(p_ip_address)) = 0 THEN
    RAISE EXCEPTION 'ip_address required';
  END IF;
  IF p_max_requests IS NULL OR p_max_requests < 1 THEN
    RAISE EXCEPTION 'max_requests invalid';
  END IF;

  -- Serialize concurrent consumers for the same operation+IP (and email when present).
  v_lock_key := hashtextextended(p_operation || chr(31) || p_ip_address || chr(31) || coalesce(lower(trim(p_email)), ''), 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT count(*), min(created_at)
    INTO v_count, v_oldest
  FROM public.rate_limit_logs
  WHERE operation = p_operation
    AND ip_address = p_ip_address
    AND created_at >= v_window_start;

  v_allowed := (v_count < p_max_requests);
  v_count := v_count + 1;

  INSERT INTO public.rate_limit_logs (
    operation, ip_address, email, status, request_count, max_requests, window_seconds, tenant_id
  ) VALUES (
    p_operation,
    p_ip_address,
    NULLIF(lower(trim(p_email)), ''),
    CASE WHEN v_allowed THEN 'allowed' ELSE 'blocked' END,
    v_count,
    p_max_requests,
    p_window_seconds,
    p_tenant_id
  );

  IF v_allowed THEN
    v_retry := GREATEST(1, p_window_seconds);
  ELSE
    v_retry := GREATEST(
      1,
      CEIL(EXTRACT(EPOCH FROM ((COALESCE(v_oldest, now()) + make_interval(secs => p_window_seconds)) - now())))::integer
    );
  END IF;

  allowed := v_allowed;
  request_count := v_count;
  retry_after_seconds := v_retry;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(text, text, integer, integer, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, text, integer, integer, text, uuid) TO service_role;

-- ─── 2. Tenant registration verification columns ─────────────────────────────
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS registration_status text;

UPDATE public.tenants
SET registration_status = 'active',
    email_verified_at = COALESCE(email_verified_at, created_at)
WHERE registration_status IS NULL;

ALTER TABLE public.tenants
  ALTER COLUMN registration_status SET DEFAULT 'active';

COMMENT ON COLUMN public.tenants.email_verified_at IS
  'When contact_email ownership was verified for public self-registration. NULL = unverified.';
COMMENT ON COLUMN public.tenants.registration_status IS
  'pending_email_verification | email_verified | active. Legacy rows backfilled to active.';

-- ─── 3. Single-use email verification tokens (store hash only) ───────────────
CREATE TABLE IF NOT EXISTS public.tenant_registration_email_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email_normalized text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_ip text
);

CREATE INDEX IF NOT EXISTS idx_tenant_reg_email_tokens_tenant
  ON public.tenant_registration_email_tokens (tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_reg_email_tokens_expires
  ON public.tenant_registration_email_tokens (expires_at)
  WHERE used_at IS NULL;

ALTER TABLE public.tenant_registration_email_tokens ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.tenant_registration_email_tokens IS
  'Hashed single-use tokens for public tenant registration email verification. Never store raw tokens.';

-- Atomic consume + activate (prevents concurrent double-verify).
CREATE OR REPLACE FUNCTION public.consume_tenant_registration_email_token(
  p_token_hash text
)
RETURNS TABLE (
  ok boolean,
  reason text,
  tenant_id uuid,
  email_normalized text,
  slug text,
  tenant_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token public.tenant_registration_email_tokens%ROWTYPE;
  v_tenant public.tenants%ROWTYPE;
  v_now timestamptz := now();
BEGIN
  IF p_token_hash IS NULL OR length(p_token_hash) < 32 THEN
    ok := false; reason := 'invalid'; RETURN NEXT; RETURN;
  END IF;

  SELECT * INTO v_token
  FROM public.tenant_registration_email_tokens t
  WHERE t.token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    ok := false; reason := 'invalid'; RETURN NEXT; RETURN;
  END IF;
  IF v_token.used_at IS NOT NULL THEN
    ok := false; reason := 'used'; RETURN NEXT; RETURN;
  END IF;
  IF v_token.expires_at < v_now THEN
    ok := false; reason := 'expired'; RETURN NEXT; RETURN;
  END IF;

  SELECT * INTO v_tenant
  FROM public.tenants tn
  WHERE tn.id = v_token.tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    ok := false; reason := 'tenant_missing'; RETURN NEXT; RETURN;
  END IF;

  IF lower(trim(coalesce(v_tenant.contact_email, ''))) <> v_token.email_normalized THEN
    ok := false; reason := 'email_mismatch'; RETURN NEXT; RETURN;
  END IF;

  UPDATE public.tenant_registration_email_tokens
  SET used_at = v_now
  WHERE id = v_token.id
    AND used_at IS NULL;

  IF NOT FOUND THEN
    ok := false; reason := 'used'; RETURN NEXT; RETURN;
  END IF;

  UPDATE public.tenants
  SET
    email_verified_at = coalesce(email_verified_at, v_now),
    registration_status = 'email_verified',
    is_active = true,
    updated_at = v_now
  WHERE id = v_tenant.id;

  ok := true;
  reason := NULL;
  tenant_id := v_tenant.id;
  email_normalized := v_token.email_normalized;
  slug := v_tenant.slug;
  tenant_name := v_tenant.name;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_tenant_registration_email_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_tenant_registration_email_token(text) TO service_role;

COMMIT;
