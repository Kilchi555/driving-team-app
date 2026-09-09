-- Meta click identifiers on the website → app hop logger.
-- Production already has these columns; IF NOT EXISTS keeps other envs aligned.

ALTER TABLE booking_redirects
  ADD COLUMN IF NOT EXISTS fbclid TEXT,
  ADD COLUMN IF NOT EXISTS fbc TEXT,
  ADD COLUMN IF NOT EXISTS fbp TEXT;

COMMENT ON COLUMN booking_redirects.fbclid IS 'Meta Ads click ID captured on drivingteam.ch before redirect to booking app';
COMMENT ON COLUMN booking_redirects.fbc IS 'Meta _fbc cookie (fb.1.{ts}.{fbclid}) captured on drivingteam.ch';
