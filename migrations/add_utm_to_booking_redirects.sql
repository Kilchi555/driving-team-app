-- Add UTM attribution columns to booking_redirects
-- Allows server-side attribution tracking independent of GA4/cookies

ALTER TABLE booking_redirects
  ADD COLUMN IF NOT EXISTS utm_source   TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium   TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_content  TEXT;
