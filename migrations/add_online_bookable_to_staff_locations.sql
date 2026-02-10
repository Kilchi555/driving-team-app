-- Add online bookable flag to staff_locations
-- Allows staff to control which locations are available for online booking by customers

ALTER TABLE staff_locations 
ADD COLUMN IF NOT EXISTS is_online_bookable BOOLEAN DEFAULT true;

-- Comment for clarity
COMMENT ON COLUMN staff_locations.is_online_bookable IS 'Whether customers can book this staff at this location via online booking (frontend availability calendar)';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_staff_locations_online_bookable 
ON staff_locations(staff_id, location_id) 
WHERE is_online_bookable = true AND is_active = true;
