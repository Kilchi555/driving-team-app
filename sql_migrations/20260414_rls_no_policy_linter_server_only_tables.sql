-- Supabase Linter 0008 (rls_enabled_no_policy): Tabellen mit RLS aber ohne Policy
--
-- Diese Tabellen werden nur über Service Role (Server-APIs) beschrieben/gelesen;
-- service_role umgeht RLS. Explizite Policies für anon/authenticated mit false
-- dokumentieren „kein PostgREST-Zugriff“ und befriedigen den Linter.

BEGIN;

-- ---------------------------------------------------------------------------
-- public.affiliate_leads
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.affiliate_leads') IS NOT NULL THEN
    DROP POLICY IF EXISTS affiliate_leads_no_client_access ON public.affiliate_leads;
    CREATE POLICY affiliate_leads_no_client_access ON public.affiliate_leads
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- public.booking_events, booking_redirects, calculator_events
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.booking_events') IS NOT NULL THEN
    DROP POLICY IF EXISTS booking_events_no_client_access ON public.booking_events;
    CREATE POLICY booking_events_no_client_access ON public.booking_events
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;

  IF to_regclass('public.booking_redirects') IS NOT NULL THEN
    DROP POLICY IF EXISTS booking_redirects_no_client_access ON public.booking_redirects;
    CREATE POLICY booking_redirects_no_client_access ON public.booking_redirects
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;

  IF to_regclass('public.calculator_events') IS NOT NULL THEN
    DROP POLICY IF EXISTS calculator_events_no_client_access ON public.calculator_events;
    CREATE POLICY calculator_events_no_client_access ON public.calculator_events
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END $$;

COMMIT;
