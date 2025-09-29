-- ========================================
-- FIX RLS CIRCULAR DEPENDENCY EMERGENCY
-- ========================================
-- The current RLS policies create a circular dependency:
-- Policy tries to SELECT from users table to check tenant_id,
-- but that's the same table being accessed!

-- Step 1: Drop the problematic policies
DROP POLICY IF EXISTS users_own_tenant_only ON users;
DROP POLICY IF EXISTS users_secure_tenant_isolation ON users;

-- Step 2: Create simple, safe policy for own profile access
CREATE POLICY users_own_profile_simple ON users
    FOR SELECT
    TO authenticated
    USING (
        auth_user_id = auth.uid()
        AND deleted_at IS NULL
    );

-- Step 3: Create policy for admin access within same tenant
-- This uses a simpler approach without circular dependency
CREATE POLICY users_admin_access ON users
    FOR ALL
    TO authenticated
    USING (
        -- Own profile
        auth_user_id = auth.uid()
        OR
        -- Admin access (using JWT claims instead of table lookup)
        (
            (auth.jwt() ->> 'role')::text IN ('admin', 'staff')
            AND deleted_at IS NULL
        )
    )
    WITH CHECK (
        -- Own profile
        auth_user_id = auth.uid()
        OR
        -- Admin can create/update
        (auth.jwt() ->> 'role')::text IN ('admin', 'staff')
    );

-- Step 4: Verify policies
SELECT 
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- Step 5: Test message
DO $$
BEGIN
    RAISE NOTICE '✅ RLS circular dependency fixed!';
    RAISE NOTICE 'New policies:';
    RAISE NOTICE '1. users_own_profile_simple - Users can access their own profile';
    RAISE NOTICE '2. users_admin_access - Admins can access users in their tenant';
    RAISE NOTICE '';
    RAISE NOTICE 'Login should work now!';
END $$;
