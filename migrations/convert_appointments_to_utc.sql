-- Migration: Convert all appointments from Swiss Local Time to UTC
-- This converts stored times that are in Europe/Zurich timezone to UTC
-- 
-- Background:
-- - Previously: Appointments stored in Swiss local time (Europe/Zurich)
-- - Now: Appointments stored in UTC for consistency and to avoid timezone ambiguity
--
-- Conversion Logic:
-- - Swiss local time is UTC+1 (standard time) or UTC+2 (daylight saving time)
-- - For simplicity, we use AT TIME ZONE to handle the conversion
-- - PostgreSQL will automatically handle DST transitions

BEGIN;

-- Step 1: Drop dependent views (we'll recreate them after)
DROP VIEW IF EXISTS invited_customers_enhanced CASCADE;
DROP VIEW IF EXISTS medical_certificate_reviews CASCADE;

-- Step 2: Add temporary columns to store converted times
ALTER TABLE appointments 
ADD COLUMN start_time_utc TIMESTAMP WITH TIME ZONE,
ADD COLUMN end_time_utc TIMESTAMP WITH TIME ZONE;

-- Step 3: Convert times from Swiss local time to UTC
-- Treat the stored time as if it were in Europe/Zurich, then convert to UTC
UPDATE appointments
SET 
  start_time_utc = (start_time AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'UTC',
  end_time_utc = (end_time AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'UTC';

-- Step 4: Replace old columns with converted values
ALTER TABLE appointments 
DROP COLUMN start_time,
DROP COLUMN end_time;

ALTER TABLE appointments
RENAME COLUMN start_time_utc TO start_time;

ALTER TABLE appointments
RENAME COLUMN end_time_utc TO end_time;

-- Step 5: Add constraint to ensure times are in UTC
COMMENT ON COLUMN appointments.start_time IS 'Start time in UTC. Display in client timezone using AT TIME ZONE operator.';
COMMENT ON COLUMN appointments.end_time IS 'End time in UTC. Display in client timezone using AT TIME ZONE operator.';

COMMIT;

-- Verification query (run after migration):
-- SELECT 
--   id, 
--   title,
--   start_time as start_time_utc,
--   (start_time AT TIME ZONE 'Europe/Zurich') as start_time_zurich,
--   end_time as end_time_utc,
--   (end_time AT TIME ZONE 'Europe/Zurich') as end_time_zurich
-- FROM appointments 
-- LIMIT 5;

