-- Add canton, city, postal_code, and updated_at columns to locations table
-- These fields are useful for better location management and filtering

-- Add canton column (e.g., ZH, BE, LU, etc.)
ALTER TABLE locations
ADD COLUMN IF NOT EXISTS canton VARCHAR(2);

-- Add city column
ALTER TABLE locations
ADD COLUMN IF NOT EXISTS city VARCHAR(255);

-- Add postal_code column
ALTER TABLE locations
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10);

-- Add updated_at column for tracking changes
ALTER TABLE locations
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add comments for documentation
COMMENT ON COLUMN locations.canton IS 'Swiss canton abbreviation (e.g., ZH, BE, LU)';
COMMENT ON COLUMN locations.city IS 'City name';
COMMENT ON COLUMN locations.postal_code IS 'Postal code (PLZ)';
COMMENT ON COLUMN locations.updated_at IS 'Timestamp of last update';

-- Create index for faster filtering by canton
CREATE INDEX IF NOT EXISTS idx_locations_canton ON locations(canton);

-- Create index for faster filtering by postal_code
CREATE INDEX IF NOT EXISTS idx_locations_postal_code ON locations(postal_code);

-- Optional: Add check constraint for canton (only valid Swiss cantons)
-- Drop existing constraint if it exists, then recreate
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_valid_canton' 
    AND conrelid = 'locations'::regclass
  ) THEN
    ALTER TABLE locations DROP CONSTRAINT check_valid_canton;
  END IF;
END $$;

ALTER TABLE locations
ADD CONSTRAINT check_valid_canton 
CHECK (
  canton IS NULL OR 
  canton IN (
    'AG', 'AI', 'AR', 'BE', 'BL', 'BS', 'FR', 'GE', 'GL', 'GR', 
    'JU', 'LU', 'NE', 'NW', 'OW', 'SG', 'SH', 'SO', 'SZ', 'TG', 
    'TI', 'UR', 'VD', 'VS', 'ZG', 'ZH'
  )
);

-- Show updated table structure
SELECT 
  column_name, 
  data_type, 
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'locations'
  AND column_name IN ('canton', 'city', 'postal_code', 'address')
ORDER BY ordinal_position;

