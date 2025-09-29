-- Final fix: Move user to the correct tenant
-- The user should belong to the "Driving Team" tenant where the external busy times are stored

-- Step 1: Check current user data
SELECT 
    'BEFORE FIX' as status,
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.tenant_id,
    t.name as tenant_name
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.auth_user_id = '54c82b77-a758-4372-88a8-a8081b464d45';

-- Step 2: Update user to Driving Team tenant
UPDATE users 
SET tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
WHERE auth_user_id = '54c82b77-a758-4372-88a8-a8081b464d45';

-- Step 3: Verify the update
SELECT 
    'AFTER FIX' as status,
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.tenant_id,
    t.name as tenant_name
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.auth_user_id = '54c82b77-a758-4372-88a8-a8081b464d45';

-- Step 4: Test access to external busy times
SELECT 
    'EXTERNAL BUSY TIMES ACCESS TEST' as test,
    COUNT(*) as accessible_records
FROM external_busy_times
WHERE tenant_id = '64259d68-195a-4c68-8875-f1b44d962830';
