-- Migration: Fix UTC conversion that was done incorrectly
-- 
-- Problem: The previous migration converted local times incorrectly
-- 05:00 Zurich should be 04:00 UTC, but it's stored as 06:00 UTC
-- 
-- Root cause: The migration used wrong timezone conversion direction
-- 
-- Solution: Reverse the incorrect conversion and apply the correct one

BEGIN;

-- Step 1: Add temporary columns for the corrected times
ALTER TABLE appointments 
ADD COLUMN start_time_fixed TIMESTAMP WITH TIME ZONE,
ADD COLUMN end_time_fixed TIMESTAMP WITH TIME ZONE;

-- Step 2: Fix the conversion
-- Current state: Times are stored as if they were UTC but they're actually 1 hour too far ahead
-- We need to subtract 1 hour (or 2 during DST) to get the correct UTC time
-- 
-- The issue is:
-- - Original local time: 05:00 Zurich
-- - Should be stored as UTC: 04:00+00 (because Zurich is UTC+1 in November)
-- - Currently stored as: 06:00+00 (which is WRONG - 1 hour too much)
-- 
-- So we subtract 2 hours (because the current value is 1 hour too much, 
-- and we need to go back another hour to get to UTC from the wrongly stored value)
-- Actually, let's think differently:
-- Current state shows 06:00 when it should show 04:00
-- Difference: 2 hours
-- So: subtract 2 hours from current values

UPDATE appointments
SET 
  start_time_fixed = start_time - INTERVAL '2 hours',
  end_time_fixed = end_time - INTERVAL '2 hours';

-- Step 3: Replace old columns with fixed values
ALTER TABLE appointments 
DROP COLUMN start_time,
DROP COLUMN end_time;

ALTER TABLE appointments
RENAME COLUMN start_time_fixed TO start_time;

ALTER TABLE appointments
RENAME COLUMN end_time_fixed TO end_time;

-- Step 4: Verify the fix (run separately after migration)
-- SELECT 
--   id, 
--   title,
--   start_time as start_time_utc,
--   (start_time AT TIME ZONE 'Europe/Zurich') as start_time_zurich
-- FROM appointments 
-- LIMIT 5;

COMMIT;

