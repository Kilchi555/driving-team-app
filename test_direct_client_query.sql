-- ========================================
-- TEST DIRECT CLIENT QUERY
-- ========================================
-- This mimics exactly what the frontend is doing

-- Step 1: Show what the frontend query should return
SELECT 
    'Frontend Query Simulation' as test,
    id,
    created_at,
    email,
    first_name,
    last_name,
    phone,
    birthdate,
    street,
    street_nr,
    zip,
    city,
    is_active,
    category,
    assigned_staff_id,
    payment_provider_customer_id,
    lernfahrausweis_url,
    tenant_id,
    role
FROM users 
WHERE role = 'client' 
AND tenant_id = '78af580f-1670-4be3-a556-250339c872fa'
AND is_active = true
ORDER BY first_name;

-- Step 2: Check if there are any clients at all in this tenant
SELECT 
    'All clients in tenant' as test,
    COUNT(*) as total_clients,
    COUNT(*) FILTER (WHERE is_active = true) as active_clients,
    COUNT(*) FILTER (WHERE is_active = false) as inactive_clients,
    string_agg(first_name || ' ' || last_name, ', ') as client_names
FROM users 
WHERE role = 'client' 
AND tenant_id = '78af580f-1670-4be3-a556-250339c872fa';

-- Step 3: Check if Hans Meier matches the exact query
SELECT 
    'Hans Meier specific check' as test,
    id, first_name, last_name, email, role, tenant_id, is_active,
    CASE 
        WHEN role = 'client' THEN '✅ Role matches'
        ELSE '❌ Role mismatch: ' || role
    END as role_check,
    CASE 
        WHEN tenant_id = '78af580f-1670-4be3-a556-250339c872fa' THEN '✅ Tenant matches'
        ELSE '❌ Tenant mismatch: ' || tenant_id
    END as tenant_check,
    CASE 
        WHEN is_active = true THEN '✅ Active'
        ELSE '❌ Inactive'
    END as active_check
FROM users 
WHERE email = 'hans.meier@example.ch';

-- Step 4: Test RLS by simulating the exact frontend conditions
SELECT 
    'RLS Test - Exact Frontend Query' as test,
    COUNT(*) as found_clients
FROM users 
WHERE role = 'client' 
AND tenant_id = '78af580f-1670-4be3-a556-250339c872fa'
AND is_active = true;

-- Step 5: Success message
DO $$
BEGIN
    RAISE NOTICE '🔍 Testing exact frontend query conditions...';
    RAISE NOTICE 'If this shows 0 clients, the issue is in RLS or data conditions.';
    RAISE NOTICE 'If this shows clients, the issue is in the frontend code.';
END $$;




















