-- RLS wave 3: close critical Data-API holes. Server uses service_role (bypasses RLS).
-- Does not change client-facing discounts / product_sales policies.

-- 1) Dangerous SECURITY DEFINER RPCs: no anon/authenticated EXECUTE
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY[
        'get_tenant_secret',
        'unlock_account',
        'soft_delete_user',
        'restore_deleted_user',
        'test_auth_login',
        'debug_users_access',
        'debug_auth_uid',
        'list_expired_receipts'
      ])
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
      r.nspname, r.proname, r.args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role',
      r.nspname, r.proname, r.args
    );
  END LOOP;
END $$;

-- 2) Tables that were fully public (no RLS)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_google_ads_search_terms_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_meta_ads_ad_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_offers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.companies FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.marketing_google_ads_search_terms_daily FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.marketing_meta_ads_ad_daily FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.marketing_offers FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.companies TO service_role;
GRANT ALL ON TABLE public.marketing_google_ads_search_terms_daily TO service_role;
GRANT ALL ON TABLE public.marketing_meta_ads_ad_daily TO service_role;
GRANT ALL ON TABLE public.marketing_offers TO service_role;

-- 3) SECURITY DEFINER views → invoker (RLS of base tables applies)
ALTER VIEW public.invoices_with_details SET (security_invoker = true);
ALTER VIEW public.medical_certificate_reviews SET (security_invoker = true);

REVOKE ALL ON TABLE public.invoices_with_details FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.medical_certificate_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.invoices_with_details TO service_role;
GRANT SELECT ON TABLE public.medical_certificate_reviews TO service_role;

-- 4) Token tables: no list-SELECT for anon/public
DROP POLICY IF EXISTS tokens_public_read ON public.session_confirmation_tokens;
DROP POLICY IF EXISTS password_reset_tokens_anon_read ON public.password_reset_tokens;
DROP POLICY IF EXISTS password_reset_tokens_user_read ON public.password_reset_tokens;

ALTER TABLE public.session_confirmation_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.session_confirmation_tokens FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.password_reset_tokens FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.session_confirmation_tokens TO service_role;
GRANT ALL ON TABLE public.password_reset_tokens TO service_role;

-- 5) Dunning + scraped leads: server-only (drop USING(true) client policies)
DROP POLICY IF EXISTS dunning_settings_authenticated_rw ON public.dunning_settings;
DROP POLICY IF EXISTS dunning_templates_authenticated_rw ON public.dunning_templates;
DROP POLICY IF EXISTS invoice_dunning_log_authenticated_rw ON public.invoice_dunning_log;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.fahrlehrer_leads;
DROP POLICY IF EXISTS "Authenticated users can read leads" ON public.fahrlehrer_leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.fahrlehrer_leads;

REVOKE ALL ON TABLE public.dunning_settings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.dunning_templates FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.invoice_dunning_log FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.fahrlehrer_leads FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.dunning_settings TO service_role;
GRANT ALL ON TABLE public.dunning_templates TO service_role;
GRANT ALL ON TABLE public.invoice_dunning_log TO service_role;
GRANT ALL ON TABLE public.fahrlehrer_leads TO service_role;
