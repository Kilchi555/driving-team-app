-- ========================================
-- FIX HANS MEIER WITH COMPLETE DATA
-- ========================================
-- This script adds all missing data for Hans Meier
-- based on typical registration data

-- Step 1: Check current state
SELECT 
    id,
    email,
    first_name,
    last_name,
    phone,
    birthdate,
    street,
    street_nr,
    zip,
    city,
    category,
    lernfahrausweis_nr,
    tenant_id
FROM public.users 
WHERE email = 'hans.meier@example.ch';

-- Step 2: Update with complete sample data
UPDATE public.users 
SET 
    phone = '+41791234567',
    birthdate = '1985-03-15',
    street = 'Musterstrasse',
    street_nr = '123',
    zip = '8001',
    city = 'Zürich',
    category = ARRAY['B'],
    lernfahrausweis_nr = 'L1234567',
    updated_at = NOW()
WHERE 
    email = 'hans.meier@example.ch' 
    AND first_name = 'Hans' 
    AND last_name = 'Meier'
    AND tenant_id = '78af580f-1670-4be3-a556-250339c872fa';

-- Step 3: Verify the update
SELECT 
    id,
    email,
    first_name,
    last_name,
    phone,
    birthdate,
    street,
    street_nr,
    zip,
    city,
    category,
    lernfahrausweis_nr,
    tenant_id,
    updated_at
FROM public.users 
WHERE email = 'hans.meier@example.ch';

-- Check if update was successful
DO $$
DECLARE
    user_record RECORD;
BEGIN
    SELECT * INTO user_record
    FROM public.users 
    WHERE email = 'hans.meier@example.ch';
    
    IF user_record.phone IS NOT NULL AND 
       user_record.street IS NOT NULL AND 
       user_record.category IS NOT NULL THEN
        RAISE NOTICE '✅ Hans Meier successfully updated with complete data';
        RAISE NOTICE 'Phone: %', user_record.phone;
        RAISE NOTICE 'Address: % %, % %', user_record.street, user_record.street_nr, user_record.zip, user_record.city;
        RAISE NOTICE 'Category: %', user_record.category;
        RAISE NOTICE 'Lernfahrausweis: %', user_record.lernfahrausweis_nr;
    ELSE
        RAISE NOTICE '❌ Update failed or incomplete';
    END IF;
END $$;
