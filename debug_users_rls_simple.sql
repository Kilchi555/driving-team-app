-- ========================================
-- DEBUG USERS RLS - SIMPLE APPROACH
-- ========================================

-- Step 1: Check current policies
SELECT 
    schemaname, tablename, policyname, cmd, permissive, roles, qual
FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY policyname;

-- Step 2: Drop ALL existing policies
DROP POLICY IF EXISTS users_jwt_select ON users;
DROP POLICY IF EXISTS users_jwt_insert ON users;
DROP POLICY IF EXISTS users_jwt_update ON users;
DROP POLICY IF EXISTS users_jwt_delete ON users;
DROP POLICY IF EXISTS users_simple_access ON users;
DROP POLICY IF EXISTS users_admin_access ON users;
DROP POLICY IF EXISTS users_own_profile_access ON users;
DROP POLICY IF EXISTS users_own_profile_simple ON users;
DROP POLICY IF EXISTS users_tenant_access_safe ON users;
DROP POLICY IF EXISTS users_admin_modify ON users;

-- Step 3: Create ONE SIMPLE policy for SELECT
-- This allows authenticated users to see all non-deleted users
CREATE POLICY users_see_all ON users
    FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

-- Step 4: Create simple policies for other operations
CREATE POLICY users_modify_own ON users
    FOR ALL
    TO authenticated
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- Step 5: Test query as authenticated user
SELECT 
    'Testing users visibility' as test,
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE role = 'client') as clients,
    COUNT(*) FILTER (WHERE role = 'staff') as staff,
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_users,
    string_agg(DISTINCT role, ', ') as all_roles
FROM users;

-- Step 6: Show specific client data
SELECT 
    id, first_name, last_name, email, role, tenant_id, is_active, deleted_at
FROM users 
WHERE role = 'client' 
AND deleted_at IS NULL
ORDER BY created_at DESC;

-- Step 7: Check if Hans Meier is visible
SELECT 
    'Hans Meier check' as test,
    id, first_name, last_name, email, role, tenant_id, is_active
FROM users 
WHERE email = 'hans.meier@example.ch';

-- Step 8: Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Simple RLS policies created!';
    RAISE NOTICE '';
    RAISE NOTICE 'Created policies:';
    RAISE NOTICE '1. users_see_all - All authenticated users can see non-deleted users';
    RAISE NOTICE '2. users_modify_own - Users can only modify their own profile';
    RAISE NOTICE '';
    RAISE NOTICE 'This should show Hans Meier and other clients now!';
END $$;
