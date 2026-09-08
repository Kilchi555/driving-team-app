-- Binding booking conversion claim uniqueness.
-- Development/test migration only in this change set — do not apply to production here.
--
-- Goal: claim/insert a conversion row BEFORE calling Google or Meta, with unique
-- constraints so concurrent webhooks cannot double-send.
--
-- Dedupes existing rows with a success-preferring strategy. Does not delete a
-- successful conversion unless a duplicate success exists for the same claim key.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Backfill Google Ads order_id so uniqueness has a stable key
-- ---------------------------------------------------------------------------
UPDATE public.google_ads_conversion_uploads
SET order_id = appointment_id::text
WHERE order_id IS NULL
  AND appointment_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Success-preferring dedupe on order_id
-- ---------------------------------------------------------------------------
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY order_id
      ORDER BY
        CASE upload_status
          WHEN 'success' THEN 0
          WHEN 'skipped_no_click_id' THEN 1
          WHEN 'adjusted_retracted' THEN 2
          WHEN 'pending' THEN 3
          WHEN 'failed' THEN 4
          ELSE 5
        END,
        created_at ASC,
        id ASC
    ) AS rn
  FROM public.google_ads_conversion_uploads
  WHERE order_id IS NOT NULL
)
DELETE FROM public.google_ads_conversion_uploads
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- ---------------------------------------------------------------------------
-- 3. Success-preferring dedupe on appointment_id + conversion_action_id
-- ---------------------------------------------------------------------------
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY appointment_id, conversion_action_id
      ORDER BY
        CASE upload_status
          WHEN 'success' THEN 0
          WHEN 'skipped_no_click_id' THEN 1
          WHEN 'adjusted_retracted' THEN 2
          WHEN 'pending' THEN 3
          WHEN 'failed' THEN 4
          ELSE 5
        END,
        created_at ASC,
        id ASC
    ) AS rn
  FROM public.google_ads_conversion_uploads
  WHERE appointment_id IS NOT NULL
)
DELETE FROM public.google_ads_conversion_uploads
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS google_ads_conversion_uploads_order_id_uidx
  ON public.google_ads_conversion_uploads (order_id)
  WHERE order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS google_ads_conversion_uploads_appt_action_uidx
  ON public.google_ads_conversion_uploads (appointment_id, conversion_action_id)
  WHERE appointment_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Meta CAPI: stable event_id + nullable appointment_id for courses
-- ---------------------------------------------------------------------------
ALTER TABLE public.meta_capi_uploads
  ADD COLUMN IF NOT EXISTS event_id text;

ALTER TABLE public.meta_capi_uploads
  ALTER COLUMN appointment_id DROP NOT NULL;

UPDATE public.meta_capi_uploads
SET event_id = 'capi_' || appointment_id::text
WHERE event_id IS NULL
  AND appointment_id IS NOT NULL;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY event_name, event_id
      ORDER BY
        CASE upload_status
          WHEN 'success' THEN 0
          WHEN 'skipped_no_click_id' THEN 1
          WHEN 'skipped_no_signal' THEN 2
          WHEN 'pending' THEN 3
          WHEN 'failed' THEN 4
          ELSE 5
        END,
        created_at ASC,
        id ASC
    ) AS rn
  FROM public.meta_capi_uploads
  WHERE event_id IS NOT NULL
)
DELETE FROM public.meta_capi_uploads
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS meta_capi_uploads_event_uidx
  ON public.meta_capi_uploads (event_name, event_id)
  WHERE event_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS meta_capi_uploads_appt_event_uidx
  ON public.meta_capi_uploads (appointment_id, event_name)
  WHERE appointment_id IS NOT NULL;

COMMENT ON COLUMN public.meta_capi_uploads.event_id IS
  'Stable CAPI event_id (capi_{appointment_id} or capi_course_{registration_id}). Reused on retry.';

COMMIT;
