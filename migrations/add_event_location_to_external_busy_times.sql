-- Add event_location column to external_busy_times table
-- This stores the location/address from external calendar events (e.g., Google Calendar, ICS)

-- Add event_location column
ALTER TABLE "public"."external_busy_times"
ADD COLUMN IF NOT EXISTS "event_location" TEXT;

-- Add comment
COMMENT ON COLUMN "public"."external_busy_times"."event_location" IS 'Location/address from external calendar event';

-- Verify the change
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'external_busy_times' 
  AND column_name = 'event_location';

