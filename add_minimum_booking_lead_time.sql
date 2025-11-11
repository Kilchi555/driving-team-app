-- Add minimum booking lead time to staff availability settings
-- This defines how far in advance customers must book appointments

ALTER TABLE staff_availability_settings
ADD COLUMN IF NOT EXISTS minimum_booking_lead_time_hours INTEGER DEFAULT 24;

COMMENT ON COLUMN staff_availability_settings.minimum_booking_lead_time_hours IS 'Minimum hours in advance that customers must book appointments (e.g., 8 = customers can only book appointments that are at least 8 hours in the future)';

-- Example: Set 8 hours lead time for a specific staff member
-- UPDATE staff_availability_settings
-- SET minimum_booking_lead_time_hours = 8
-- WHERE staff_id = 'your-staff-id';

-- Verify
SELECT 
  s.staff_id,
  u.first_name,
  u.last_name,
  s.minimum_booking_lead_time_hours,
  s.availability_mode
FROM staff_availability_settings s
JOIN users u ON u.id = s.staff_id
WHERE s.minimum_booking_lead_time_hours IS NOT NULL
LIMIT 10;

