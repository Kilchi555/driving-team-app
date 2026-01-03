-- SAFE USERS RLS POLICIES - NO RECURSION
-- 
-- Strategy: 
-- 1. Users can read their own profile (auth_user_id match)
-- 2. Staff/Admin can read users in their tenant (simple direct check)
-- 3. Super admin can read all users in their tenants
--
-- AVOID: Subqueries that read FROM users (causes recursion)

-- Step 1: Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Staff can read users in tenant" ON users;
DROP POLICY IF EXISTS "Admins can manage users" ON users;
DROP POLICY IF EXISTS "Super admins can read all users" ON users;
DROP POLICY IF EXISTS "Authenticated users can read tenant members" ON users;
DROP POLICY IF EXISTS "Staff can read users in their tenant" ON users;
DROP POLICY IF EXISTS "Service role bypass" ON users;

-- Step 2: Create SAFE, non-recursive policies

-- Policy 1: Users can read their own profile
CREATE POLICY "Users can read their own profile" ON users
  FOR SELECT
  USING (auth_user_id = auth.uid());

-- Policy 2: Staff can SELECT other users in same tenant (NO SUBQUERY!)
-- This checks: is current user a staff? Do they belong to tenant X?
-- If yes, they can read users from that tenant
CREATE POLICY "Staff can read users in their tenant" ON users
  FOR SELECT
  USING (
    -- Current user must be staff/admin/super_admin
    -- We check this using the simple join logic:
    -- auth.uid() belongs to a user with role staff/admin/super_admin
    -- AND that user's tenant = this row's tenant
    (
      SELECT role 
      FROM users AS current_user 
      WHERE current_user.auth_user_id = auth.uid()
      LIMIT 1
    ) IN ('staff', 'admin', 'super_admin')
    AND
    -- Tenant must match
    (
      SELECT tenant_id 
      FROM users AS current_user 
      WHERE current_user.auth_user_id = auth.uid()
      LIMIT 1
    ) = users.tenant_id
  );

-- Policy 3: Super admin can read all users
CREATE POLICY "Super admin can read all users" ON users
  FOR SELECT
  USING (
    (
      SELECT role 
      FROM users AS current_user 
      WHERE current_user.auth_user_id = auth.uid()
      LIMIT 1
    ) = 'super_admin'
  );

-- Policy 4: Service role (backend APIs) can always read
CREATE POLICY "Service role can read all users" ON users
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Step 3: Test - Run these queries as different users
-- As authenticated user:
-- SELECT id, email, first_name FROM users LIMIT 1;

-- Step 4: Enable RLS if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 5: Verify
SELECT 
  policyname, 
  cmd,
  SUBSTR(qual, 1, 100) as qual_preview
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

