-- Add Google Ads click ID columns to booking_proposals for attribution reporting.
-- The contact form (drivingteam.ch) passes gclid/gbraid/wbraid from marketing_attribution
-- but these were not being persisted. Without them we cannot audit which proposals
-- came from Google Ads clicks, or retry failed conversion uploads.

ALTER TABLE booking_proposals
  ADD COLUMN IF NOT EXISTS gclid TEXT,
  ADD COLUMN IF NOT EXISTS gbraid TEXT,
  ADD COLUMN IF NOT EXISTS wbraid TEXT;

COMMENT ON COLUMN booking_proposals.gclid  IS 'Google Ads click ID captured from ?gclid= URL parameter at form submission time.';
COMMENT ON COLUMN booking_proposals.gbraid IS 'Google click ID for iOS app campaigns (gbraid).';
COMMENT ON COLUMN booking_proposals.wbraid IS 'Google click ID for web-to-app campaigns (wbraid).';
