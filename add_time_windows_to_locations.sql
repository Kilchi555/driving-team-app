-- Add time windows to locations table
-- Allows defining specific time slots when a location is available

ALTER TABLE locations
ADD COLUMN IF NOT EXISTS time_windows JSONB DEFAULT '[]';

-- Example structure:
-- [
--   { "start": "07:00", "end": "09:00", "days": [1,2,3,4,5] },  -- Mo-Fr 07:00-09:00
--   { "start": "16:00", "end": "19:00", "days": [1,2,3,4,5] }   -- Mo-Fr 16:00-19:00
-- ]
-- days: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday

COMMENT ON COLUMN locations.time_windows IS 'JSONB array of time windows when this location is available. Each window has start, end (HH:MM format) and days (array of weekday numbers 0-6)';

-- Example: Set time windows for a location
-- UPDATE locations
-- SET time_windows = '[
--   {"start": "07:00", "end": "09:00", "days": [1,2,3,4,5]},
--   {"start": "16:00", "end": "19:00", "days": [1,2,3,4,5]}
-- ]'::jsonb
-- WHERE id = 'your-location-id';

-- Verify
SELECT 
  id,
  name,
  time_windows,
  jsonb_pretty(time_windows) as time_windows_formatted
FROM locations
WHERE time_windows IS NOT NULL AND time_windows != '[]'::jsonb
LIMIT 5;

