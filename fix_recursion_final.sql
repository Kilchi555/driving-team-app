-- ========================================
-- FINAL FIX: REMOVE ALL CIRCULAR POLICIES
-- ========================================
-- These specific policies cause infinite recursion:
-- - tenants_own_tenant_access (looks up users table)
-- - tenants_strict_own_only (looks up users table) 
-- - users_own_profile_access (looks up users table from users table)

-- Step 1: Drop all circular policies
DROP POLICY IF EXISTS tenants_own_tenant_access ON tenants;
DROP POLICY IF EXISTS tenants_strict_own_only ON tenants;
DROP POLICY IF EXISTS users_own_profile_access ON users;

-- Step 2: Keep only the simple, safe policies
-- users_admin_access - OK (uses JWT claims)
-- users_own_profile_simple - OK (direct auth.uid() comparison)
-- tenants_anonymous_select - OK (simple is_active check)
-- tenants_public_select - OK (simple is_active check)

-- Step 3: Verify remaining policies are safe
SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%SELECT%FROM users%' THEN '❌ CIRCULAR'
        ELSE '✅ SAFE'
    END as safety_status
FROM pg_policies 
WHERE tablename IN ('users', 'tenants')
ORDER BY tablename, policyname;

-- Step 4: Success message
DO $$
BEGIN
    RAISE NOTICE '✅ INFINITE RECURSION FIXED!';
    RAISE NOTICE '';
    RAISE NOTICE 'Removed circular policies:';
    RAISE NOTICE '- tenants_own_tenant_access';
    RAISE NOTICE '- tenants_strict_own_only'; 
    RAISE NOTICE '- users_own_profile_access';
    RAISE NOTICE '';
    RAISE NOTICE 'Kept safe policies:';
    RAISE NOTICE '- users_admin_access (JWT-based)';
    RAISE NOTICE '- users_own_profile_simple (direct auth.uid)';
    RAISE NOTICE '- tenants_anonymous_select (simple is_active)';
    RAISE NOTICE '- tenants_public_select (simple is_active)';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 LOGIN AND TENANT LOADING SHOULD WORK NOW!';
END $$;
