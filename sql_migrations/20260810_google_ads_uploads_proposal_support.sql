-- Allow inquiry (and other non-appointment) conversion uploads to be audited + retried.
-- Previously appointment_id was NOT NULL uuid FK → inserts with proposal_* synthetic ids always failed.

ALTER TABLE public.google_ads_conversion_uploads
  ALTER COLUMN appointment_id DROP NOT NULL;

ALTER TABLE public.google_ads_conversion_uploads
  ADD COLUMN IF NOT EXISTS proposal_id uuid REFERENCES public.booking_proposals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS order_id text;

COMMENT ON COLUMN public.google_ads_conversion_uploads.proposal_id IS 'booking_proposals.id when conversion is an inquiry/lead (nullable)';
COMMENT ON COLUMN public.google_ads_conversion_uploads.order_id IS 'Google Ads orderId used for dedupe (e.g. inquiry-<uuid> or appointment uuid)';

ALTER TABLE public.google_ads_conversion_uploads
  DROP CONSTRAINT IF EXISTS google_ads_conversion_uploads_source_check;

ALTER TABLE public.google_ads_conversion_uploads
  ADD CONSTRAINT google_ads_conversion_uploads_source_check
  CHECK (appointment_id IS NOT NULL OR proposal_id IS NOT NULL OR order_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS google_ads_conversion_uploads_proposal_id_idx
  ON public.google_ads_conversion_uploads (proposal_id)
  WHERE proposal_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS google_ads_conversion_uploads_order_id_idx
  ON public.google_ads_conversion_uploads (order_id)
  WHERE order_id IS NOT NULL;
