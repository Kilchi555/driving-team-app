-- Migration: Extract city and postal_code from address string
-- Populates city and postal_code columns from existing address data
-- Format: "Street, NNNN City" or "Street NNNN City"

-- Migration: Extract city and postal_code from address string
-- Populates city and postal_code columns from existing address data
-- Format: "Street, NNNN City"

-- Step 1: Extract postal code - 4 digits after comma and space
-- Example: "Cilanderstrasse, 9100 Herisau" -> take chars 2-5 after ", " = "9100"
UPDATE locations
SET postal_code = SUBSTRING(address FROM POSITION(', ' IN address) + 2 FOR 4)
WHERE postal_code IS NULL 
  AND address IS NOT NULL 
  AND address LIKE '%, %';

-- Step 2: Extract city - everything after postal code + space
-- Example: "Cilanderstrasse, 9100 Herisau" -> take everything after "9100 "
UPDATE locations
SET city = TRIM(SUBSTRING(address FROM POSITION(', ' IN address) + 7))
WHERE city IS NULL 
  AND address IS NOT NULL 
  AND address LIKE '%, %';

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

