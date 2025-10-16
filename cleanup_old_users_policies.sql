-- Cleanup: Remove old/duplicate RLS policies from users table
-- Keep only the new, clean policies created by fix_users_rls_policies.sql

-- Remove old duplicate policies
DROP POLICY IF EXISTS "Allow admins to delete users" ON users;
DROP POLICY IF EXISTS "Allow admins to insert users" ON users;
DROP POLICY IF EXISTS "Allow admins to update users" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to view users" ON users;
DROP POLICY IF EXISTS "users_see_all" ON users;
DROP POLICY IF EXISTS "users_update_all" ON users; -- CRITICAL: This allows ALL users to update ALL data!

-- Verify: Show remaining policies (should only be the 6 new ones)
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY cmd, policyname;

-- Expected result: Only these 6 policies should remain:
-- 1. Users can read own profile (SELECT)
-- 2. Users can read tenant users (SELECT)
-- 3. Users can insert during registration (INSERT)
-- 4. Users can update own profile (UPDATE)
-- 5. Admins can update tenant users (UPDATE)
-- 6. Admins can delete tenant users (DELETE)

