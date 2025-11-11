-- Fix timezone for external calendar events
-- Convert UTC timestamps to local Swiss time (Europe/Zurich)

-- This script corrects external_busy_times entries that were stored in UTC
-- but should be in local time (as per the app's convention)

-- Example: 
-- Before: 2025-11-12 07:00:00+00 (UTC)
-- After:  2025-11-12 08:00:00 (Local Swiss time, no timezone)

-- Step 1: Add 1 hour to all timestamps (UTC+1 for standard time)
-- Note: This assumes all events are in standard time (winter)
-- For summer time (UTC+2), you would need to add 2 hours

-- IMPORTANT: Run this only once! Check your data first.

-- Preview what will change (run this first to verify):
SELECT 
  id,
  event_title,
  start_time AS old_start,
  (start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Zurich')::timestamp AS new_start,
  end_time AS old_end,
  (end_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Zurich')::timestamp AS new_end
FROM external_busy_times
WHERE sync_source = 'ics'
  AND start_time::text LIKE '%+00'
ORDER BY start_time
LIMIT 20;

-- If the preview looks correct, uncomment and run this update:
/*
UPDATE external_busy_times
SET 
  start_time = (start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Zurich')::timestamp,
  end_time = (end_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Zurich')::timestamp,
  last_updated_at = NOW()
WHERE sync_source = 'ics'
  AND start_time::text LIKE '%+00';
*/

-- Verify the update:
SELECT 
  id,
  event_title,
  start_time,
  end_time,
  last_updated_at
FROM external_busy_times
WHERE sync_source = 'ics'
ORDER BY start_time DESC
LIMIT 10;

