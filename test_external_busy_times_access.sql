-- Test direct access to external_busy_times table
-- This will help us understand if RLS policies are blocking access

-- First, let's check the current user's auth_user_id and tenant_id
SELECT 
    'Current User Info' as test,
    auth.uid() as auth_user_id,
    u.id as user_id,
    u.tenant_id,
    u.email,
    u.first_name,
    u.last_name
FROM users u
WHERE u.auth_user_id = auth.uid();

-- Test 1: Try to select from external_busy_times with RLS
SELECT 
    'RLS Test - All Records' as test,
    COUNT(*) as total_records
FROM external_busy_times;

-- Test 2: Try to select with tenant filter
SELECT 
    'RLS Test - Tenant Filter' as test,
    COUNT(*) as tenant_records
FROM external_busy_times
WHERE tenant_id = '64259d68-195a-4c68-8875-f1b44d962830';

-- Test 3: Try to select with staff filter
SELECT 
    'RLS Test - Staff Filter' as test,
    COUNT(*) as staff_records
FROM external_busy_times
WHERE staff_id = '091afa9b-e8a1-43b8-9cae-3195621619ae';

-- Test 4: Try to select with both filters
SELECT 
    'RLS Test - Both Filters' as test,
    COUNT(*) as both_records
FROM external_busy_times
WHERE tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
  AND staff_id = '091afa9b-e8a1-43b8-9cae-3195621619ae';

-- Test 5: Check if RLS is enabled
SELECT 
    'RLS Status' as test,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'external_busy_times';

-- Test 6: Check current policies
SELECT 
    'Current Policies' as test,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'external_busy_times';
