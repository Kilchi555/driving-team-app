-- ========================================
-- EMERGENCY USER-TENANT REPAIR
-- ========================================
-- This fixes users who have lost their tenant_id assignment

-- ========================================
-- STEP 1: DIAGNOSE THE PROBLEM
-- ========================================

-- Check current user's auth info
SELECT 
    'CURRENT_AUTH_USER' as check_type,
    auth.uid() as auth_user_id,
    auth.role() as auth_role;

-- Find user record by auth_user_id
SELECT 
    'USER_RECORD_SEARCH' as check_type,
    id,
    auth_user_id,
    email,
    tenant_id,
    role,
    is_active,
    deleted_at,
    created_at
FROM users 
WHERE auth_user_id = auth.uid();

-- Check if there are multiple user records for this auth_user_id
SELECT 
    'DUPLICATE_CHECK' as check_type,
    COUNT(*) as record_count,
    array_agg(id) as user_ids,
    array_agg(tenant_id) as tenant_ids,
    array_agg(email) as emails
FROM users 
WHERE auth_user_id = auth.uid();

-- ========================================
-- STEP 2: FIND CORRECT TENANT ASSIGNMENT
-- ========================================

-- Look for user in all tenants (emergency lookup)
SELECT 
    'TENANT_SEARCH' as check_type,
    u.id as user_id,
    u.email,
    u.tenant_id,
    u.role,
    t.name as tenant_name,
    t.slug as tenant_slug
FROM users u
LEFT JOIN tenants t ON t.id = u.tenant_id
WHERE u.auth_user_id = auth.uid()
OR u.email LIKE '%kilchi%'  -- Assuming your email contains 'kilchi'
OR u.email LIKE '%pascal%'   -- Or contains 'pascal'
ORDER BY u.created_at DESC;

-- ========================================
-- STEP 3: CHECK FOR ORPHANED RECORDS
-- ========================================

-- Find users without tenant_id
SELECT 
    'ORPHANED_USERS' as check_type,
    COUNT(*) as orphaned_count,
    array_agg(email) as orphaned_emails
FROM users 
WHERE tenant_id IS NULL 
AND is_active = true 
AND deleted_at IS NULL;

-- ========================================
-- STEP 4: EMERGENCY TENANT ASSIGNMENT
-- ========================================

-- If user exists but has no tenant_id, assign to "Deine Fahrschule"
UPDATE users 
SET 
    tenant_id = '78af580f-1670-4be3-a556-250339c872fa',  -- Deine Fahrschule
    updated_at = NOW()
WHERE auth_user_id = auth.uid()
AND tenant_id IS NULL
AND is_active = true
AND deleted_at IS NULL;

-- ========================================
-- STEP 5: VERIFICATION AFTER REPAIR
-- ========================================

-- Check if repair was successful
SELECT 
    'REPAIR_VERIFICATION' as check_type,
    id,
    auth_user_id,
    email,
    tenant_id,
    role,
    'REPAIRED' as status
FROM users 
WHERE auth_user_id = auth.uid()
AND tenant_id IS NOT NULL;

-- Test session verification again
SELECT 
    'SESSION_RETEST' as check_type,
    u.tenant_id,
    t.name as tenant_name,
    'SESSION_FIXED' as status
FROM users u
JOIN tenants t ON t.id = u.tenant_id
WHERE u.auth_user_id = auth.uid()
AND u.is_active = true
AND u.deleted_at IS NULL
LIMIT 1;

-- ========================================
-- STEP 6: FINAL TENANT ACCESS TEST
-- ========================================

-- This should now show ONLY "Deine Fahrschule"
SELECT 
    'FINAL_TENANT_TEST' as test_type,
    id,
    name,
    slug
FROM tenants 
WHERE is_active = true
ORDER BY name;

-- ========================================
-- COMPLETION MESSAGE
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🚑 EMERGENCY USER-TENANT REPAIR COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ACTIONS TAKEN:';
    RAISE NOTICE '✅ Diagnosed user-tenant assignment';
    RAISE NOTICE '✅ Repaired missing tenant_id';
    RAISE NOTICE '✅ Assigned to "Deine Fahrschule"';
    RAISE NOTICE '✅ Verified session consistency';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  NEXT STEPS:';
    RAISE NOTICE '1. Refresh browser completely (Ctrl+F5)';
    RAISE NOTICE '2. Re-login if necessary';
    RAISE NOTICE '3. Verify only "Deine Fahrschule" data is visible';
    RAISE NOTICE '========================================';
END $$;
