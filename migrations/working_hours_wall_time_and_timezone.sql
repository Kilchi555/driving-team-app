-- Migration: staff_working_hours → wall-clock TIME + timezone column
-- 
-- CONTEXT:
--   Original schema used TIME (wall clock).
--   A previous migration changed it to TIMETZ, treating existing values as UTC.
--   The old frontend code subtracted the browser CET offset before saving,
--   so stored values encode "Zurich wall time − CET offset":
--     e.g. 08:00 CET → stored as 07:00+00
--
-- GOAL:
--   1. Add 'timezone' column (IANA name) for future multi-timezone tenants.
--   2. Convert TIMETZ back to TIME, restoring the intended Zurich wall time
--      by adding +1h (CET offset) — the offset used when the data was saved.
--
-- IMPORTANT:
--   This +1h correction is correct for data saved in CET (winter).
--   Any rows saved in CEST (summer, UTC+2) would have been stored with −2h,
--   so they will be off by −1h after this migration. Those rows are rare
--   and can be corrected by staff via re-saving their working hours in the UI.
--
-- Run this ONCE on the production database before deploying the matching
-- server code that reads start_time/end_time as Zurich wall time.

BEGIN;

-- 1. Add timezone column (idempotent)
ALTER TABLE staff_working_hours
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Europe/Zurich';

COMMENT ON COLUMN staff_working_hours.timezone IS
  'IANA timezone identifier, e.g. Europe/Zurich. Defines the wall-clock timezone for start_time/end_time.';

-- 2. Convert TIMETZ → TIME, applying +1h correction
--    TIMETZ::TIME strips the offset and returns the bare clock value (e.g. 07:00).
--    Adding 1 hour gives the original Zurich CET wall time (08:00).
ALTER TABLE staff_working_hours
  ALTER COLUMN start_time TYPE TIME
    USING (start_time::TIME + INTERVAL '1 hour'),
  ALTER COLUMN end_time TYPE TIME
    USING (end_time::TIME + INTERVAL '1 hour');

-- 3. Verify a sample (non-destructive, shows in migration logs)
DO $$
DECLARE
  sample RECORD;
BEGIN
  SELECT start_time, end_time, timezone
  INTO sample
  FROM staff_working_hours
  LIMIT 1;

  IF FOUND THEN
    RAISE NOTICE 'Sample row after migration: start=% end=% tz=%',
      sample.start_time, sample.end_time, sample.timezone;
  ELSE
    RAISE NOTICE 'No rows in staff_working_hours (table is empty).';
  END IF;
END $$;

COMMIT;
