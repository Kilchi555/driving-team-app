-- ULTRA-SAFE USERS RLS POLICIES - ZERO RECURSION RISK
--
-- This approach uses ONLY:
-- 1. auth.uid() - current authenticated user's UID
-- 2. Direct JWT claims - no table reads
-- 3. Service role bypass
--
-- NO subqueries to users table (eliminates recursion risk entirely)

-- Step 1: Drop ALL existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can read their own profile" ON users;
DROP POLICY IF EXISTS "Staff can read users in tenant" ON users;
DROP POLICY IF EXISTS "Staff can read users in their tenant" ON users;
DROP POLICY IF EXISTS "Admins can manage users" ON users;
DROP POLICY IF EXISTS "Super admin can read all users" ON users;
DROP POLICY IF EXISTS "Super admins can read all users" ON users;
DROP POLICY IF EXISTS "Service role can read all users" ON users;
DROP POLICY IF EXISTS "Service role bypass" ON users;
DROP POLICY IF EXISTS "Authenticated users can read tenant members" ON users;
DROP POLICY IF EXISTS "User can read own profile" ON users;
DROP POLICY IF EXISTS "Service role can read users" ON users;
DROP POLICY IF EXISTS "Service role can create users" ON users;
DROP POLICY IF EXISTS "User can update own profile" ON users;
DROP POLICY IF EXISTS "Service role can update users" ON users;
DROP POLICY IF EXISTS "Service role can delete users" ON users;

-- Step 2: Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 3: Create ULTRA-SAFE policies
-- Strategy: Only use auth.uid() - NO table reads = ZERO recursion risk

-- Policy 1: Users can ALWAYS read their own profile
CREATE POLICY "User self read" ON users
  FOR SELECT
  USING (auth_user_id = auth.uid());

-- Policy 2: Service role (backend/APIs) can read everything
CREATE POLICY "Service role read" ON users
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Policy 3: Service role can INSERT
CREATE POLICY "Service role insert" ON users
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Policy 4: Users can UPDATE their own profile
CREATE POLICY "User self update" ON users
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Policy 5: Service role can UPDATE any user
CREATE POLICY "Service role update" ON users
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policy 6: Service role can DELETE
CREATE POLICY "Service role delete" ON users
  FOR DELETE
  USING (auth.role() = 'service_role');

-- Step 4: Verify policies
SELECT 
  policyname, 
  tablename,
  cmd,
  SUBSTR(qual::text, 1, 100) as qual_preview
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- Step 5: Check RLS status
SELECT 
  schemaname, 
  tablename, 
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename = 'users';
