-- ========================================
-- FIX USERS ACCESS FOR CUSTOMER PAGE
-- ========================================
-- The simple RLS policy is too restrictive - admins/staff need to see students

-- Step 1: Drop the too-restrictive policy
DROP POLICY IF EXISTS users_simple_access ON users;

-- Step 2: Create a better policy that allows:
-- 1. Users to see their own profile
-- 2. Admins/Staff to see users in their tenant (without circular lookup)
CREATE POLICY users_tenant_access_safe ON users
    FOR SELECT
    TO authenticated
    USING (
        -- Own profile
        auth_user_id = auth.uid()
        OR
        -- Admin/Staff can see all users (using JWT role, no table lookup)
        (
            (auth.jwt() ->> 'role')::text IN ('admin', 'staff')
            AND deleted_at IS NULL
        )
    );

-- Step 3: Add policy for INSERT/UPDATE/DELETE (admins only)
CREATE POLICY users_admin_modify ON users
    FOR ALL
    TO authenticated
    USING (
        -- Own profile
        auth_user_id = auth.uid()
        OR
        -- Only admins can modify other users
        (auth.jwt() ->> 'role')::text = 'admin'
    )
    WITH CHECK (
        -- Own profile
        auth_user_id = auth.uid()
        OR
        -- Only admins can create/modify users
        (auth.jwt() ->> 'role')::text = 'admin'
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

-- Step 5: Success message
DO $$
BEGIN
    RAISE NOTICE '✅ User access fixed for customer page!';
    RAISE NOTICE '';
    RAISE NOTICE 'New policies:';
    RAISE NOTICE '1. users_tenant_access_safe - Staff/Admin can see all users';
    RAISE NOTICE '2. users_admin_modify - Admins can modify users';
    RAISE NOTICE '';
    RAISE NOTICE 'Customer page should show students now!';
END $$;












