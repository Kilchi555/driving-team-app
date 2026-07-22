-- Store click IDs on booking_redirects for attribution fallback when dt_attr is missing.

ALTER TABLE booking_redirects
  ADD COLUMN IF NOT EXISTS gclid  TEXT,
  ADD COLUMN IF NOT EXISTS gbraid TEXT,
  ADD COLUMN IF NOT EXISTS wbraid TEXT;

COMMENT ON COLUMN booking_redirects.gclid IS 'Google Ads click ID captured on drivingteam.ch before redirect to booking app';
