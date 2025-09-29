-- Move external busy times from Pascal user to Admin user
-- This will allow the admin to see the external busy times

-- Step 1: Check current external busy times
SELECT 
    'Current external busy times' as step,
    staff_id,
    COUNT(*) as count
FROM external_busy_times
GROUP BY staff_id;

-- Step 2: Update external busy times to use admin user as staff
UPDATE external_busy_times 
SET staff_id = 'ba1c73c6-9b57-4739-adcc-b2235aeb6a01'
WHERE staff_id = '091afa9b-e8a1-43b8-9cae-3195621619ae';

-- Step 3: Update external calendars to use admin user as staff
UPDATE external_calendars 
SET staff_id = 'ba1c73c6-9b57-4739-adcc-b2235aeb6a01'
WHERE staff_id = '091afa9b-e8a1-43b8-9cae-3195621619ae';

-- Step 4: Verify the update
SELECT 
    'Updated external busy times' as step,
    staff_id,
    COUNT(*) as count
FROM external_busy_times
GROUP BY staff_id;

-- Step 5: Test access
SELECT 
    'Access test' as step,
    COUNT(*) as accessible_records
FROM external_busy_times
WHERE staff_id = 'ba1c73c6-9b57-4739-adcc-b2235aeb6a01';
