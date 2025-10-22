-- FIX: Allow admin/staff to see pending users (auth_user_id = null)
-- This fixes the issue where Max Mustermann and other pending users are not visible in customers.vue

-- Step 1: Check current policy
SELECT 
    policyname,
    cmd,
    qual::text as using_clause
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- Step 2: Drop existing problematic policies
DROP POLICY IF EXISTS "users_secure_tenant_isolation" ON users;
DROP POLICY IF EXISTS "users_tenant_access_safe" ON users;
DROP POLICY IF EXISTS "users_admin_modify" ON users;

-- Step 3: Create new policy that allows access to pending users
CREATE POLICY "users_tenant_access_with_pending" ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Master admin sees all non-deleted users
    (
      (auth.jwt() ->> 'role')::text = 'master_admin' 
      AND deleted_at IS NULL
    )
    OR
    -- Admins see all users in their tenant (including pending users)
    (
      (auth.jwt() ->> 'role')::text IN ('admin', 'tenant_admin')
      AND tenant_id = (
        SELECT u.tenant_id 
        FROM users u 
        WHERE u.auth_user_id = auth.uid() 
          AND u.deleted_at IS NULL
        LIMIT 1
      )
      AND deleted_at IS NULL
    )
    OR
    -- Staff see all users in their tenant (including pending users)
    (
      (auth.jwt() ->> 'role')::text = 'staff'
      AND tenant_id = (
        SELECT u.tenant_id 
        FROM users u 
        WHERE u.auth_user_id = auth.uid() 
          AND u.deleted_at IS NULL
        LIMIT 1
      )
      AND deleted_at IS NULL
    )
    OR
    -- Users see only themselves (only if they have auth_user_id)
    (
      auth_user_id = auth.uid() 
      AND deleted_at IS NULL
    )
  );

-- Step 4: Create policy for INSERT/UPDATE/DELETE
CREATE POLICY "users_modify_tenant" ON users
  FOR ALL
  TO authenticated
  USING (
    -- Master admin can modify any user
    (auth.jwt() ->> 'role')::text = 'master_admin'
    OR
    -- Admins can modify users in their tenant (including pending users)
    (
      (auth.jwt() ->> 'role')::text IN ('admin', 'tenant_admin')
      AND tenant_id = (
        SELECT u.tenant_id 
        FROM users u 
        WHERE u.auth_user_id = auth.uid() 
          AND u.deleted_at IS NULL
        LIMIT 1
      )
    )
    OR
    -- Users can modify themselves
    auth_user_id = auth.uid()
  )
  WITH CHECK (
    -- Master admin can modify any user
    (auth.jwt() ->> 'role')::text = 'master_admin'
    OR
    -- Admins can modify users in their tenant
    (
      (auth.jwt() ->> 'role')::text IN ('admin', 'tenant_admin')
      AND tenant_id = (
        SELECT u.tenant_id 
        FROM users u 
        WHERE u.auth_user_id = auth.uid() 
          AND u.deleted_at IS NULL
        LIMIT 1
      )
    )
    OR
    -- Users can modify themselves
    auth_user_id = auth.uid()
  );

-- Step 5: Verify Max Mustermann is now accessible
SELECT 
    '✅ Max Mustermann should now be visible' as message,
    id, 
    first_name, 
    last_name, 
    phone,
    tenant_id, 
    auth_user_id, 
    is_active,
    onboarding_status
FROM users 
WHERE id = 'b09e0af1-3ded-44e0-a80e-b52b11e630e1';

-- Step 6: Count all pending users in the tenant
SELECT 
    '📊 Pending users in tenant' as message,
    COUNT(*) as pending_count
FROM users 
WHERE role = 'client' 
  AND tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
  AND auth_user_id IS NULL;

-- Step 7: Verify new policies
SELECT 
    '✅ New policies created' as message,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'users'
  AND policyname IN ('users_tenant_access_with_pending', 'users_modify_tenant')
ORDER BY policyname;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== FIX APPLIED ===';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Pending users (auth_user_id = null) are now visible to admin/staff';
    RAISE NOTICE '✅ Max Mustermann should now appear in customers.vue';
    RAISE NOTICE '';
    RAISE NOTICE 'Key changes:';
    RAISE NOTICE '1. Removed is_active check from tenant lookup subquery';
    RAISE NOTICE '2. Admin/Staff can now see ALL users in their tenant (including pending)';
    RAISE NOTICE '3. Pending users are visible even though they have auth_user_id = null';
    RAISE NOTICE '';
END $$;

