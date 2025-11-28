-- Add postal_code column to external_busy_times for efficient travel time lookups
-- This allows us to use the plz_distance_cache without additional location queries

ALTER TABLE "public"."external_busy_times"
ADD COLUMN IF NOT EXISTS "postal_code" VARCHAR(10);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_external_busy_times_postal_code ON external_busy_times(postal_code);
CREATE INDEX IF NOT EXISTS idx_external_busy_times_staff_postal ON external_busy_times(staff_id, postal_code);

-- Add comment
COMMENT ON COLUMN "public"."external_busy_times"."postal_code" IS 'Swiss postal code extracted from event_location for efficient travel time calculation';

