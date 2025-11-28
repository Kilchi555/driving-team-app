-- Create location geocoding cache table
-- Stores results from Google Geocoding API to avoid repeated API calls

CREATE TABLE IF NOT EXISTS "public"."location_geocoding_cache" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "location_name" VARCHAR(255) NOT NULL UNIQUE,
  "postal_code" VARCHAR(10),
  "address" TEXT,
  "latitude" NUMERIC(10, 7),
  "longitude" NUMERIC(10, 7),
  "cached_at" TIMESTAMPTZ DEFAULT NOW(),
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_location_geocoding_cache_name ON location_geocoding_cache(location_name);
CREATE INDEX IF NOT EXISTS idx_location_geocoding_cache_plz ON location_geocoding_cache(postal_code);

-- Add comments
COMMENT ON TABLE "public"."location_geocoding_cache" IS 'Cache for Google Geocoding API results. Maps location names to postal codes.';
COMMENT ON COLUMN "public"."location_geocoding_cache"."location_name" IS 'Normalized location name (e.g., "Uster", "Zürich Hauptbahnhof")';
COMMENT ON COLUMN "public"."location_geocoding_cache"."postal_code" IS 'Swiss 4-digit postal code extracted from geocoding result';
COMMENT ON COLUMN "public"."location_geocoding_cache"."address" IS 'Full formatted address from Google Geocoding';
COMMENT ON COLUMN "public"."location_geocoding_cache"."latitude" IS 'Latitude coordinate';
COMMENT ON COLUMN "public"."location_geocoding_cache"."longitude" IS 'Longitude coordinate';
COMMENT ON COLUMN "public"."location_geocoding_cache"."cached_at" IS 'When this result was cached (used to determine cache age)';

-- Show table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'location_geocoding_cache'
ORDER BY ordinal_position;

