-- Migration: Extract postal codes from address strings and populate postal_code column
-- This extracts Swiss 4-digit postal codes from address strings
-- Format examples: "Hauptstrasse 5, 8610 Uster", "Bahnhof Strasse, 8048 Zürich"

-- Create a helper function to extract postal code from address
CREATE OR REPLACE FUNCTION extract_postal_code_from_address(address_text TEXT)
RETURNS VARCHAR(10) AS $$
DECLARE
    plz_match VARCHAR(10);
BEGIN
    -- Try to extract 4-digit postal code from address
    -- This regex looks for exactly 4 digits that are typically followed by a space and a city name
    plz_match := (regexp_matches(address_text, '\b(\d{4})\b', 'g'))[1];
    
    -- If found, return it; otherwise return NULL
    RETURN COALESCE(plz_match, NULL);
END;
$$ LANGUAGE plpgsql;

-- Update existing locations where postal_code is NULL but address contains PLZ
UPDATE locations
SET postal_code = extract_postal_code_from_address(address)
WHERE postal_code IS NULL 
  AND address IS NOT NULL 
  AND address ~ '\d{4}';

-- Log the results
DO $$
DECLARE
    updated_count INTEGER;
    total_null_count INTEGER;
BEGIN
    -- Count how many were updated
    SELECT COUNT(*) INTO updated_count 
    FROM locations 
    WHERE postal_code IS NOT NULL;
    
    -- Count remaining NULLs
    SELECT COUNT(*) INTO total_null_count 
    FROM locations 
    WHERE postal_code IS NULL;
    
    RAISE NOTICE 'Postal code extraction complete: % locations updated, % still NULL', updated_count, total_null_count;
END $$;

-- Show updated data (sample)
SELECT 
    id,
    name,
    address,
    postal_code,
    city,
    canton
FROM locations
WHERE postal_code IS NOT NULL
LIMIT 10;

COMMENT ON FUNCTION extract_postal_code_from_address(TEXT) IS 'Extracts Swiss 4-digit postal code from address string. Returns NULL if no valid postal code found.';

