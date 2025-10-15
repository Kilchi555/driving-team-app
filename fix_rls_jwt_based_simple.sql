-- ========================================
-- FIX RLS WITH JWT-BASED ACCESS (NO CIRCULAR DEPENDENCY)
-- ========================================
-- Use JWT claims instead of database lookups to avoid recursion

-- Step 1: Drop current policy
DROP POLICY IF EXISTS users_tenant_access_safe ON users;

-- Step 2: Create JWT-based policy (no table lookups!)
CREATE POLICY users_jwt_access ON users
    FOR SELECT
    TO authenticated
    USING (
        -- Own profile
        auth_user_id = auth.uid()
        OR
        -- Admin/Staff role from JWT can see all non-deleted users
        (
            (auth.jwt() ->> 'role')::text IN ('admin', 'staff') 
            AND deleted_at IS NULL
        )
    );

-- Step 3: Also update the modify policy to be simpler
DROP POLICY IF EXISTS users_admin_modify ON users;

CREATE POLICY users_jwt_modify ON users
    FOR INSERT, UPDATE, DELETE
    TO authenticated
    USING (
        auth_user_id = auth.uid()
        OR
        (auth.jwt() ->> 'role')::text = 'admin'
    )
    WITH CHECK (
        auth_user_id = auth.uid()
        OR
        (auth.jwt() ->> 'role')::text = 'admin'
    );

-- Step 4: Check JWT claims for current user
SELECT 
    auth.jwt() ->> 'role' as jwt_role,
    auth.jwt() ->> 'email' as jwt_email,
    auth.uid() as auth_uid;

-- Step 5: Test query that customers page uses
SELECT 
    COUNT(*) as total_clients,
    array_agg(first_name || ' ' || last_name) as client_names
FROM users 
WHERE role = 'client' 
AND deleted_at IS NULL
AND is_active = true;

-- Step 6: Success message
DO $$
BEGIN
    RAISE NOTICE '✅ JWT-based RLS policy created (no circular dependencies)!';
    RAISE NOTICE '';
    RAISE NOTICE 'This policy uses:';
    RAISE NOTICE '1. auth.jwt() claims instead of table lookups';
    RAISE NOTICE '2. Direct auth.uid() comparisons';
    RAISE NOTICE '3. No recursive queries';
    RAISE NOTICE '';
    RAISE NOTICE 'Customer page should work now!';
END $$;











