-- ========================================
-- FIX RLS WITH CORRECT SYNTAX
-- ========================================
-- PostgreSQL requires separate policies for different operations

-- Step 1: Drop current policies
DROP POLICY IF EXISTS users_tenant_access_safe ON users;
DROP POLICY IF EXISTS users_admin_modify ON users;

-- Step 2: Create JWT-based SELECT policy (no table lookups!)
CREATE POLICY users_jwt_select ON users
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

-- Step 3: Create separate policies for INSERT, UPDATE, DELETE
CREATE POLICY users_jwt_insert ON users
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth_user_id = auth.uid()
        OR
        (auth.jwt() ->> 'role')::text = 'admin'
    );

CREATE POLICY users_jwt_update ON users
    FOR UPDATE
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

CREATE POLICY users_jwt_delete ON users
    FOR DELETE
    TO authenticated
    USING (
        auth_user_id = auth.uid()
        OR
        (auth.jwt() ->> 'role')::text = 'admin'
    );

-- Step 4: Test the SELECT policy with a client query
SELECT 
    COUNT(*) as total_clients,
    string_agg(first_name || ' ' || last_name, ', ') as client_names
FROM users 
WHERE role = 'client' 
AND deleted_at IS NULL
AND is_active = true;

-- Step 5: Success message
DO $$
BEGIN
    RAISE NOTICE '✅ JWT-based RLS policies created with correct syntax!';
    RAISE NOTICE '';
    RAISE NOTICE 'Created policies:';
    RAISE NOTICE '1. users_jwt_select - Staff/Admin can see all users';
    RAISE NOTICE '2. users_jwt_insert - Admin can create users';
    RAISE NOTICE '3. users_jwt_update - Admin can update users';
    RAISE NOTICE '4. users_jwt_delete - Admin can delete users';
    RAISE NOTICE '';
    RAISE NOTICE 'Customer page should show clients now!';
END $$;
