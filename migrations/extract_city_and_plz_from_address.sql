-- Migration: Extract city and postal_code from address string
-- Populates city and postal_code columns from existing address data
-- Format: "Street, NNNN City" or "Street NNNN City"

-- Step 1: Extract postal code (4 digits) from address
UPDATE locations
SET postal_code = (
  -- Extract 4-digit number from address
  (regexp_matches(address, '\b(\d{4})\b', 'g'))[1]
)
WHERE postal_code IS NULL 
  AND address IS NOT NULL 
  AND address ~ '\d{4}';

-- Step 2: Extract city (everything after the postal code)
UPDATE locations
SET city = TRIM(
  -- Get everything after the postal code
  substring(
    address,
    position(regexp_substr(address, '\b\d{4}\b') || ' ' in address) + 5
  )
)
WHERE city IS NULL 
  AND address IS NOT NULL 
  AND address ~ '\d{4}';

-- Step 3: Handle special case where no postal code in address
-- Try to extract city as the last word or last part
UPDATE locations
SET city = TRIM(
  -- Get the last part (after comma or last space)
  CASE 
    WHEN address LIKE '%,%' THEN TRIM(substring(address FROM position(',' in address) + 1))
    ELSE TRIM(split_part(address, ' ', -1))
  END
)
WHERE city IS NULL 
  AND postal_code IS NULL 
  AND address IS NOT NULL;

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

