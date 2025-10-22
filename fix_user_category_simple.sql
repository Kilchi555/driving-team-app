-- Simple fix for Hans Meier's missing category
-- Execute this step by step

-- Step 1: Check current user data
SELECT 
    id,
    email,
    first_name,
    last_name,
    category,
    tenant_id
FROM public.users 
WHERE 
    email = 'hans.meier@example.ch' 
    AND first_name = 'Hans' 
    AND last_name = 'Meier';

-- Step 2: Update the category (execute separately)
UPDATE public.users 
SET category = ARRAY['B']
WHERE email = 'hans.meier@example.ch' 
    AND first_name = 'Hans' 
    AND last_name = 'Meier'
    AND tenant_id = '78af580f-1670-4be3-a556-250339c872fa';

-- Step 3: Verify the update (execute separately)
SELECT 
    id,
    email,
    first_name,
    last_name,
    category,
    tenant_id
FROM public.users 
WHERE 
    email = 'hans.meier@example.ch' 
    AND first_name = 'Hans' 
    AND last_name = 'Meier';
















