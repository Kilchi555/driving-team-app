-- Fix user tenant assignment
-- The user should belong to the "Driving Team" tenant (64259d68-195a-4c68-8875-f1b44d962830)
-- instead of their current tenant (78af580f-1670-4be3-a556-250339c872fa)

-- First, let's check the current user data
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.tenant_id,
    t.name as tenant_name
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.auth_user_id = '54c82b77-a758-4372-88a8-a8081b464d45';

-- Check what tenants exist
SELECT id, name, slug FROM tenants ORDER BY name;

-- Update the user to belong to the Driving Team tenant
UPDATE users 
SET tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
WHERE auth_user_id = '54c82b77-a758-4372-88a8-a8081b464d45';

-- Verify the update
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.tenant_id,
    t.name as tenant_name
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.auth_user_id = '54c82b77-a758-4372-88a8-a8081b464d45';
