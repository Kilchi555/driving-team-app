-- Migration: Extract city and postal_code from address string
-- Populates city and postal_code columns from existing address data
-- Format: "Street, NNNN City" or "Street NNNN City"

-- Migration: Extract city and postal_code from address string
-- Populates city and postal_code columns from existing address data
-- Format: "Street, NNNN City" or "Street NNNN City"

-- Step 1: Extract postal code - take characters after last comma/space that contain 4 digits
-- Example: "Cilanderstrasse, 9100 Herisau" -> postal_code = "9100"
UPDATE locations
SET postal_code = SUBSTRING(
  address,
  POSITION(SUBSTRING(address, '\d{4}') IN address),
  4
)
WHERE postal_code IS NULL 
  AND address IS NOT NULL 
  AND LENGTH(address) > 0;

-- Step 2: Extract city - take everything after the postal code + space
-- Example: "Cilanderstrasse, 9100 Herisau" -> city = "Herisau"
UPDATE locations
SET city = TRIM(
  SUBSTRING(
    address,
    POSITION(SUBSTRING(address, '\d{4}') IN address) + 5
  )
)
WHERE city IS NULL 
  AND postal_code IS NOT NULL 
  AND address IS NOT NULL;

-- Step 3: Handle special case where no postal code in address
-- Try to extract city as the last part after comma
UPDATE locations
SET city = TRIM(SUBSTRING(address FROM position(',' in address) + 1))
WHERE city IS NULL 
  AND postal_code IS NULL 
  AND address IS NOT NULL 
  AND address LIKE '%,%';

-- Verify results
SELECT 
  id,
  name,
  address,
  postal_code,
  city,
  canton
FROM locations
WHERE address IS NOT NULL
LIMIT 20;

-- Show summary
SELECT 
  COUNT(*) as total_locations,
  COUNT(CASE WHEN postal_code IS NOT NULL THEN 1 END) as with_postal_code,
  COUNT(CASE WHEN city IS NOT NULL THEN 1 END) as with_city
FROM locations;

