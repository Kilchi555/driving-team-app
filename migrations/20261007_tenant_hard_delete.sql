-- Superadmin tenant hard-delete support
-- 1) Audit/job table
-- 2) Transactional RPC that clears NO ACTION / no-FK / financial blockers then deletes the tenant root
--
-- SECURITY: function is SECURITY DEFINER, EXECUTE revoked from PUBLIC/anon/authenticated,
-- granted only to service_role. Application layer must authorize super_admin before calling.

BEGIN;

CREATE TABLE IF NOT EXISTS public.tenant_hard_delete_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  tenant_name text NOT NULL,
  tenant_slug text,
  requested_by_user_id uuid,
  requested_by_auth_user_id uuid,
  requested_by_email text,
  status text NOT NULL
    CHECK (status IN ('PENDING','RUNNING','VERIFYING','COMPLETED','FAILED','PARTIAL_FAILURE')),
  preview_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  actual_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  auth_deleted jsonb NOT NULL DEFAULT '[]'::jsonb,
  auth_skipped jsonb NOT NULL DEFAULT '[]'::jsonb,
  storage_deleted jsonb NOT NULL DEFAULT '[]'::jsonb,
  storage_failed jsonb NOT NULL DEFAULT '[]'::jsonb,
  verification_result jsonb,
  email_sent boolean NOT NULL DEFAULT false,
  email_recipient text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tenant_hard_delete_jobs IS
  'Technical audit of Superadmin tenant hard-delete operations. Stores WHO/WHAT/WHEN/RESULT — not copies of deleted customer PII payloads.';

ALTER TABLE public.tenant_hard_delete_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_hard_delete_jobs_service_only ON public.tenant_hard_delete_jobs;
-- No policies for authenticated/anon → only service_role (bypasses RLS) can access.

CREATE OR REPLACE FUNCTION public.hard_delete_tenant_data(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_counts jsonb := '{}'::jsonb;
  v_n bigint;
BEGIN
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id required';
  END IF;

  SELECT name INTO v_name FROM public.tenants WHERE id = p_tenant_id;
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'tenant not found: %', p_tenant_id;
  END IF;

  -- Avoid self-FK block when cascading accounting_accounts
  UPDATE public.tenants
  SET default_payment_account_id = NULL
  WHERE id = p_tenant_id;

  -- ── NO ACTION / RESTRICT children of tenants ──────────────────────────
  DELETE FROM public.booking_events WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('booking_events', v_n);

  DELETE FROM public.booking_redirects WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('booking_redirects', v_n);

  DELETE FROM public.google_ads_conversion_uploads WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('google_ads_conversion_uploads', v_n);

  DELETE FROM public.marketing_attributions WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('marketing_attributions', v_n);

  DELETE FROM public.marketing_ga4_daily WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('marketing_ga4_daily', v_n);

  DELETE FROM public.marketing_google_ads_daily WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('marketing_google_ads_daily', v_n);

  DELETE FROM public.marketing_gsc_daily WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('marketing_gsc_daily', v_n);

  DELETE FROM public.course_invoice_bindings WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('course_invoice_bindings', v_n);

  -- ── No-FK tenant_id tables ────────────────────────────────────────────
  DELETE FROM public.email_campaign_leads
  WHERE campaign_id IN (SELECT id FROM public.email_campaigns WHERE tenant_id = p_tenant_id);

  DELETE FROM public.email_campaign_variants
  WHERE campaign_id IN (SELECT id FROM public.email_campaigns WHERE tenant_id = p_tenant_id);

  DELETE FROM public.email_campaigns WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('email_campaigns', v_n);

  DELETE FROM public.email_templates WHERE tenant_id = p_tenant_id;
  DELETE FROM public.imported_customers WHERE tenant_id = p_tenant_id;
  DELETE FROM public.imported_invoices WHERE tenant_id = p_tenant_id;
  DELETE FROM public.imported_records WHERE tenant_id = p_tenant_id;
  DELETE FROM public.imports_batches WHERE tenant_id = p_tenant_id;
  DELETE FROM public.lead_import_jobs WHERE tenant_id = p_tenant_id;

  DELETE FROM public.leads WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('leads', v_n);

  DELETE FROM public.marketing_google_ads_search_terms_daily WHERE tenant_id = p_tenant_id;
  DELETE FROM public.public_course_invoice_mail_claims WHERE tenant_id = p_tenant_id;
  DELETE FROM public.registration_sari_memberships WHERE tenant_id = p_tenant_id;
  DELETE FROM public.reminder_providers WHERE tenant_id = p_tenant_id;
  DELETE FROM public.reminder_settings WHERE tenant_id = p_tenant_id;
  DELETE FROM public.reminder_templates WHERE tenant_id = p_tenant_id;
  DELETE FROM public.session_confirmation_tokens WHERE tenant_id = p_tenant_id;
  DELETE FROM public.staff_working_hour_exception_intervals WHERE tenant_id = p_tenant_id;
  DELETE FROM public.user_discount_codes WHERE tenant_id = p_tenant_id;
  DELETE FROM public.website_leads WHERE tenant_id = p_tenant_id;

  -- ── SET NULL owned rows (prefer delete over orphan) ───────────────────
  DELETE FROM public.invoice_dunning_log WHERE tenant_id = p_tenant_id;
  DELETE FROM public.marketing_meta_ads_daily WHERE tenant_id = p_tenant_id;
  DELETE FROM public.marketing_meta_adsets_daily WHERE tenant_id = p_tenant_id;
  DELETE FROM public.meta_capi_uploads WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('meta_capi_uploads', v_n);
  DELETE FROM public.website_lifecycle_events WHERE tenant_id = p_tenant_id;
  DELETE FROM public.website_prospects WHERE tenant_id = p_tenant_id OR matched_tenant_id = p_tenant_id;

  -- ── Financial: payments before appointments (payments.appointment_id NO ACTION) ──
  DELETE FROM public.webhook_logs
  WHERE payment_id IN (SELECT id FROM public.payments WHERE tenant_id = p_tenant_id);

  DELETE FROM public.payment_wallee_transactions
  WHERE payment_id IN (SELECT id FROM public.payments WHERE tenant_id = p_tenant_id);

  DELETE FROM public.payment_audit_logs
  WHERE payment_id IN (SELECT id FROM public.payments WHERE tenant_id = p_tenant_id);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('payment_audit_logs', v_n);

  DELETE FROM public.payment_refunds
  WHERE payment_id IN (SELECT id FROM public.payments WHERE tenant_id = p_tenant_id);

  DELETE FROM public.payment_reminders
  WHERE payment_id IN (SELECT id FROM public.payments WHERE tenant_id = p_tenant_id);

  DELETE FROM public.payment_access_grants
  WHERE payment_id IN (SELECT id FROM public.payments WHERE tenant_id = p_tenant_id)
     OR tenant_id = p_tenant_id;

  DELETE FROM public.refund_requests
  WHERE payment_id IN (SELECT id FROM public.payments WHERE tenant_id = p_tenant_id)
     OR tenant_id = p_tenant_id;

  -- course_registrations.payment_id is RESTRICT — clear linkage first
  UPDATE public.course_registrations
  SET payment_id = NULL
  WHERE tenant_id = p_tenant_id AND payment_id IS NOT NULL;

  DELETE FROM public.payments WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('payments', v_n);

  -- ── Tenant root (CASCADE clears remaining CASCADE children) ───────────
  DELETE FROM public.tenants WHERE id = p_tenant_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'expected to delete 1 tenant row, deleted %', v_n;
  END IF;

  RETURN jsonb_build_object(
    'tenant_id', p_tenant_id,
    'tenant_name', v_name,
    'deleted', v_counts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.hard_delete_tenant_data(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hard_delete_tenant_data(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.hard_delete_tenant_data(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.hard_delete_tenant_data(uuid) TO service_role;

REVOKE ALL ON TABLE public.tenant_hard_delete_jobs FROM PUBLIC;
REVOKE ALL ON TABLE public.tenant_hard_delete_jobs FROM anon;
REVOKE ALL ON TABLE public.tenant_hard_delete_jobs FROM authenticated;
GRANT ALL ON TABLE public.tenant_hard_delete_jobs TO service_role;

COMMIT;
