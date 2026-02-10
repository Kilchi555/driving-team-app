-- Remove public_bookable column from locations table
-- This column is now replaced by staff_locations.is_online_bookable for granular per-staff control

ALTER TABLE locations DROP COLUMN IF EXISTS public_bookable;

-- Create index on is_active for faster queries
CREATE INDEX IF NOT EXISTS idx_locations_is_active ON locations(is_active);
