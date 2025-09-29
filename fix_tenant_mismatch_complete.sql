-- Complete fix for tenant mismatch issue
-- This script will move the user to the correct tenant so they can access external busy times

-- Step 1: Check current user data
SELECT 
    'Current User Data' as step,
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.tenant_id,
    t.name as tenant_name
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.auth_user_id = '54c82b77-a758-4372-88a8-a8081b464d45';

-- Step 2: Check available tenants
SELECT 
    'Available Tenants' as step,
    id, 
    name, 
    slug,
    is_active
FROM tenants 
ORDER BY name;

-- Step 3: Check external busy times distribution
SELECT 
    'External Busy Times by Tenant' as step,
    ebt.tenant_id,
    t.name as tenant_name,
    COUNT(*) as count
FROM external_busy_times ebt
LEFT JOIN tenants t ON ebt.tenant_id = t.id
GROUP BY ebt.tenant_id, t.name
ORDER BY count DESC;

-- Step 4: Update user to Driving Team tenant
UPDATE users 
SET tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
WHERE auth_user_id = '54c82b77-a758-4372-88a8-a8081b464d45';

-- Step 5: Verify the update
SELECT 
    'Updated User Data' as step,
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.tenant_id,
    t.name as tenant_name
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.auth_user_id = '54c82b77-a758-4372-88a8-a8081b464d45';

-- Step 6: Check if user can now access external busy times
SELECT 
    'External Busy Times Access Test' as step,
    COUNT(*) as accessible_busy_times
FROM external_busy_times ebt
WHERE ebt.tenant_id = '64259d68-195a-4c68-8875-f1b44d962830';

-- Step 7: Show sample external busy times for verification
SELECT 
    'Sample External Busy Times' as step,
    ebt.id,
    ebt.staff_id,
    ebt.start_time,
    ebt.end_time,
    ebt.event_title,
    u.first_name,
    u.last_name
FROM external_busy_times ebt
LEFT JOIN users u ON ebt.staff_id = u.id
WHERE ebt.tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
ORDER BY ebt.start_time
LIMIT 5;
