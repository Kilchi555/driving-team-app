-- Add peak time configuration to staff_availability_settings table

ALTER TABLE staff_availability_settings
ADD COLUMN IF NOT EXISTS peak_time_morning_start TIME DEFAULT '07:00:00',
ADD COLUMN IF NOT EXISTS peak_time_morning_end TIME DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS peak_time_evening_start TIME DEFAULT '17:00:00',
ADD COLUMN IF NOT EXISTS peak_time_evening_end TIME DEFAULT '19:00:00';

-- Set default values for existing records
UPDATE staff_availability_settings
SET 
  peak_time_morning_start = '07:00:00',
  peak_time_morning_end = '09:00:00',
  peak_time_evening_start = '17:00:00',
  peak_time_evening_end = '19:00:00'
WHERE peak_time_morning_start IS NULL;

-- Add comment
COMMENT ON COLUMN staff_availability_settings.peak_time_morning_start IS 'Start time for morning peak hours (Mo-Fr)';
COMMENT ON COLUMN staff_availability_settings.peak_time_morning_end IS 'End time for morning peak hours (Mo-Fr)';
COMMENT ON COLUMN staff_availability_settings.peak_time_evening_start IS 'Start time for evening peak hours (Mo-Fr)';
COMMENT ON COLUMN staff_availability_settings.peak_time_evening_end IS 'End time for evening peak hours (Mo-Fr)';

-- Verify
SELECT 
  staff_id,
  availability_mode,
  peak_time_morning_start,
  peak_time_morning_end,
  peak_time_evening_start,
  peak_time_evening_end
FROM staff_availability_settings
LIMIT 5;

