-- Add category_pickup_settings column to locations table
-- This allows defining pickup availability and radius per category per location

ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS category_pickup_settings JSONB DEFAULT '{}'::jsonb;

-- Add comment to explain the structure
COMMENT ON COLUMN locations.category_pickup_settings IS 
'Pickup settings per category. Structure: { "B": { "enabled": true, "radius_minutes": 15 }, "A": { "enabled": false, "radius_minutes": 10 } }';

-- Example update to show structure (optional, for testing)
-- UPDATE locations SET category_pickup_settings = '{"B": {"enabled": true, "radius_minutes": 15}, "A": {"enabled": false, "radius_minutes": 10}}'::jsonb WHERE id = 'some-location-id';

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'locations' 
  AND column_name = 'category_pickup_settings';

