-- Migration: Extract city and postal_code from address string
-- Populates city and postal_code columns from existing address data
-- Format: "Street, NNNN City" or "Street NNNN City"

-- Step 1: Extract postal code (4 digits) from address
-- Format: "Street, 9100 City" or "Street 9100 City"
UPDATE locations
SET postal_code = SUBSTRING(
  address,
  (position(' ' || substring(address FROM '(\d{4})') || ' ' in address) - 
   position(substring(address FROM '(\d{4})') in address)),
  4
)
WHERE postal_code IS NULL 
  AND address IS NOT NULL 
  AND address ~ '\d{4}';

-- Simpler approach: Use substring with pattern matching
UPDATE locations
SET postal_code = SUBSTRING(address, '\d{4}')
WHERE postal_code IS NULL 
  AND address IS NOT NULL 
  AND address ~ '\d{4}';

-- Step 2: Extract city (everything after the postal code and comma/space)
UPDATE locations
SET city = TRIM(
  CASE 
    -- If format is "Street, NNNN City"
    WHEN address ~ ', \d{4} ' THEN 
      SUBSTRING(address FROM '\d{4}\s+(.+)$')
    -- If format is "Street NNNN City" (no comma)
    WHEN address ~ ' \d{4} ' THEN 
      SUBSTRING(address FROM '\d{4}\s+(.+)$')
    ELSE NULL
  END
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

