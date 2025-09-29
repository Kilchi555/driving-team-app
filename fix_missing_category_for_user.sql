-- ========================================
-- FIX MISSING CATEGORY FOR SPECIFIC USER
-- ========================================
-- This script fixes the missing category for the user Hans Meier
-- who registered but didn't get the category saved properly

-- Update the specific user with the missing category (as array)
UPDATE public.users 
SET 
    category = ARRAY['B'], -- Use array syntax for TEXT[] column
    updated_at = NOW()
WHERE 
    email = 'hans.meier@example.ch' 
    AND first_name = 'Hans' 
    AND last_name = 'Meier'
    AND tenant_id = '78af580f-1670-4be3-a556-250339c872fa'
    AND category IS NULL;

-- Verify the update
SELECT 
    id,
    email,
    first_name,
    last_name,
    category,
    tenant_id,
    created_at,
    updated_at
FROM public.users 
WHERE 
    email = 'hans.meier@example.ch' 
    AND first_name = 'Hans' 
    AND last_name = 'Meier';

-- Check if the update was successful
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM public.users 
    WHERE 
        email = 'hans.meier@example.ch' 
        AND first_name = 'Hans' 
        AND last_name = 'Meier'
        AND 'B' = ANY(category); -- Check if 'B' is in the category array
        
    IF updated_count > 0 THEN
        RAISE NOTICE '✅ User Hans Meier successfully updated with category B';
    ELSE
        RAISE NOTICE '❌ User Hans Meier was not found or not updated';
    END IF;
END $$;
