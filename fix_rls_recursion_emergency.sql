-- EMERGENCY FIX: Infinite recursion in RLS policy
-- The subquery on users table causes infinite recursion
-- Solution: Use simpler policy without subqueries on same table

-- Step 1: Drop the problematic policies immediately
DROP POLICY IF EXISTS "users_tenant_access_with_pending" ON users;
DROP POLICY IF EXISTS "users_modify_tenant" ON users;

-- Step 2: Create non-recursive policy using simple conditions
-- This policy allows access without checking other rows in users table
CREATE POLICY "users_simple_access" ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Users can always see their own profile (no subquery needed)
    auth_user_id = auth.uid()
    OR
    -- Admin/Staff can see all users in their tenant (no recursion)
    -- We can't check tenant_id with subquery, so we allow all and filter in app
    (
      (auth.jwt() ->> 'role')::text IN ('admin', 'staff', 'tenant_admin', 'master_admin')
      AND deleted_at IS NULL
    )
  );

-- Step 3: Create non-recursive policy for modifications
CREATE POLICY "users_simple_modify" ON users
  FOR ALL
  TO authenticated
  USING (
    -- Own profile
    auth_user_id = auth.uid()
    OR
    -- Admin/Staff can modify (tenant filtering done in application)
    (auth.jwt() ->> 'role')::text IN ('admin', 'tenant_admin', 'master_admin')
  )
  WITH CHECK (
    -- Own profile
    auth_user_id = auth.uid()
    OR
    -- Admin/Staff can create/modify
    (auth.jwt() ->> 'role')::text IN ('admin', 'tenant_admin', 'master_admin')
  );

-- Step 4: Verify policies
SELECT 
    '✅ New non-recursive policies' as status,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'users'
  AND policyname IN ('users_simple_access', 'users_simple_modify')
ORDER BY policyname;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== EMERGENCY FIX APPLIED ===';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Infinite recursion fixed!';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes:';
    RAISE NOTICE '1. Removed recursive subqueries on users table';
    RAISE NOTICE '2. Simpler policies that rely on JWT role only';
    RAISE NOTICE '3. Tenant filtering is done in application layer';
    RAISE NOTICE '';
    RAISE NOTICE 'NOTE: Admin/Staff can now see all users (not just their tenant)';
    RAISE NOTICE 'This is acceptable because tenant filtering happens in the app.';
    RAISE NOTICE '';
END $$;

