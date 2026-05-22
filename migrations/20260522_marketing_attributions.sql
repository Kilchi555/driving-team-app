-- Marketing Attribution + Server-Side Google Ads Conversion Tracking
-- Created: 2026-05-22
--
-- Adds tables and columns required to:
--   1. Persist ad click IDs (gclid, gbraid, wbraid) + UTMs across drivingteam.ch and app.simy.ch
--   2. Link booking_events to actual appointments (closes the funnel)
--   3. Store marketing attribution directly on appointments (for server-side conversion upload)
--   4. Track Google Ads API conversion upload status (so we can retry failed uploads)

-- ============================================================================
-- 1. marketing_attributions — central attribution store
-- ============================================================================
-- Keyed by session_id (matches analytics_session_id used cross-domain).
-- Inserted/upserted when a user lands on a booking page on app.simy.ch with
-- a session_id and an attribution blob in the URL.
CREATE TABLE IF NOT EXISTS public.marketing_attributions (
  session_id     text PRIMARY KEY,
  gclid          text,
  gbraid         text,
  wbraid         text,
  utm_source     text,
  utm_medium     text,
  utm_campaign   text,
  utm_content    text,
  utm_term       text,
  landing_page   text,
  user_agent     text,
  ip_country     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketing_attributions_gclid_idx
  ON public.marketing_attributions (gclid)
  WHERE gclid IS NOT NULL;

CREATE INDEX IF NOT EXISTS marketing_attributions_created_at_idx
  ON public.marketing_attributions (created_at);

ALTER TABLE public.marketing_attributions ENABLE ROW LEVEL SECURITY;
-- No policies = service role only access (writes from server, reads from admin endpoints)

COMMENT ON TABLE public.marketing_attributions IS
  'Cross-domain marketing attribution: ad click IDs and UTM parameters captured on drivingteam.ch and forwarded to app.simy.ch.';

-- ============================================================================
-- 2. booking_events — link to actual appointments
-- ============================================================================
-- Today booking_events.event_type = 'completed' carries appointment_id in the
-- client payload but it is not persisted. With this column we can answer
-- "which marketing session produced which appointment?" with a single join.
ALTER TABLE public.booking_events
  ADD COLUMN IF NOT EXISTS appointment_id uuid;

CREATE INDEX IF NOT EXISTS booking_events_appointment_id_idx
  ON public.booking_events (appointment_id)
  WHERE appointment_id IS NOT NULL;

-- ============================================================================
-- 3. appointments — denormalize attribution for fast server-side conversion upload
-- ============================================================================
-- Storing gclid/UTMs directly on appointments lets the Google Ads API upload
-- happen with a single read (no extra join) — important because the upload runs
-- in a fire-and-forget block inside create-appointment.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS marketing_session_id text,
  ADD COLUMN IF NOT EXISTS gclid                text,
  ADD COLUMN IF NOT EXISTS gbraid               text,
  ADD COLUMN IF NOT EXISTS wbraid               text,
  ADD COLUMN IF NOT EXISTS utm_source           text,
  ADD COLUMN IF NOT EXISTS utm_medium           text,
  ADD COLUMN IF NOT EXISTS utm_campaign         text,
  ADD COLUMN IF NOT EXISTS utm_content          text,
  ADD COLUMN IF NOT EXISTS utm_term             text;

CREATE INDEX IF NOT EXISTS appointments_gclid_idx
  ON public.appointments (gclid)
  WHERE gclid IS NOT NULL;

CREATE INDEX IF NOT EXISTS appointments_marketing_session_id_idx
  ON public.appointments (marketing_session_id)
  WHERE marketing_session_id IS NOT NULL;

-- ============================================================================
-- 4. google_ads_conversion_uploads — track upload status for retries + adjustments
-- ============================================================================
-- Every server-side conversion upload to Google Ads logs a row here. This lets
-- us (a) retry failed uploads via a daily cron, (b) issue retract adjustments
-- when an appointment is cancelled, and (c) audit conversion attribution.
CREATE TABLE IF NOT EXISTS public.google_ads_conversion_uploads (
  id                     bigserial PRIMARY KEY,
  appointment_id         uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  conversion_action_id   text NOT NULL,
  gclid                  text,
  gbraid                 text,
  wbraid                 text,
  conversion_value_chf   numeric(10, 2),
  conversion_date_time   timestamptz NOT NULL,
  upload_status          text NOT NULL DEFAULT 'pending'
    CHECK (upload_status IN ('pending', 'success', 'failed', 'skipped_no_click_id', 'adjusted_retracted')),
  upload_attempts        integer NOT NULL DEFAULT 0,
  last_attempt_at        timestamptz,
  error_message          text,
  google_response        jsonb,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gacu_appointment_id_idx
  ON public.google_ads_conversion_uploads (appointment_id);

CREATE INDEX IF NOT EXISTS gacu_retry_idx
  ON public.google_ads_conversion_uploads (upload_status, last_attempt_at)
  WHERE upload_status IN ('pending', 'failed');

ALTER TABLE public.google_ads_conversion_uploads ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.google_ads_conversion_uploads IS
  'Audit + retry queue for server-side Google Ads conversion uploads. Each completed booking creates a row here.';

-- ============================================================================
-- 5. updated_at trigger for marketing_attributions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS marketing_attributions_set_updated_at ON public.marketing_attributions;
CREATE TRIGGER marketing_attributions_set_updated_at
  BEFORE UPDATE ON public.marketing_attributions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS gacu_set_updated_at ON public.google_ads_conversion_uploads;
CREATE TRIGGER gacu_set_updated_at
  BEFORE UPDATE ON public.google_ads_conversion_uploads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
