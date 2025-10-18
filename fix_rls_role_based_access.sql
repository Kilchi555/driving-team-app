-- ========================================
-- FIX RLS FOR ROLE-BASED ACCESS
-- ========================================
-- The current policy doesn't account for role-based access
-- Staff/Admin need to see clients, not just their own profile

-- Step 1: Check current user role in JWT
SELECT 
    auth.jwt() ->> 'role' as jwt_role,
    auth.uid() as auth_uid;

-- Step 2: Drop the current policy
DROP POLICY IF EXISTS users_tenant_access_safe ON users;

-- Step 3: Create role-aware policy
CREATE POLICY users_role_based_access ON users
    FOR SELECT
    TO authenticated
    USING (
        -- Always allow access to own profile
        auth_user_id = auth.uid()
        OR
        -- Staff/Admin can see clients and other staff
        (
            -- Check if current user is staff or admin (from their own record)
            EXISTS (
                SELECT 1 FROM users current_user
                WHERE current_user.auth_user_id = auth.uid()
                AND current_user.role IN ('admin', 'staff')
                AND current_user.is_active = true
                AND current_user.deleted_at IS NULL
                AND current_user.tenant_id = users.tenant_id
            )
            AND deleted_at IS NULL
        )
    );

-- Step 4: Test the policy by checking what users are visible
-- (This will be executed as the current authenticated user)
SELECT 
    COUNT(*) as total_visible_users,
    COUNT(CASE WHEN role = 'client' THEN 1 END) as visible_clients,
    COUNT(CASE WHEN role = 'staff' THEN 1 END) as visible_staff,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as visible_admins
FROM users 
WHERE deleted_at IS NULL;

-- Step 5: Show what tenant we're working with
SELECT 
    u.tenant_id,
    t.name as tenant_name,
    u.role as current_user_role
FROM users u
JOIN tenants t ON u.tenant_id = t.id
WHERE u.auth_user_id = auth.uid();

-- Step 6: Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Role-based RLS policy created!';
    RAISE NOTICE '';
    RAISE NOTICE 'This policy allows:';
    RAISE NOTICE '1. Users to see their own profile';
    RAISE NOTICE '2. Staff/Admin to see clients in their tenant';
    RAISE NOTICE '3. Proper tenant isolation';
    RAISE NOTICE '';
    RAISE NOTICE 'Customer page should show clients now!';
END $$;












