-- Fix RLS Policies WITHOUT recursion
-- The previous policies caused infinite recursion by querying users table within users policies

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can read tenant users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert during registration" ON users;
DROP POLICY IF EXISTS "Admins can read all tenant users" ON users;
DROP POLICY IF EXISTS "Admins can update tenant users" ON users;
DROP POLICY IF EXISTS "Staff can read tenant users" ON users;
DROP POLICY IF EXISTS "Admins can delete tenant users" ON users;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policy: Simple, no recursion - authenticated users can read all active users
CREATE POLICY "authenticated_users_can_read"
ON users FOR SELECT
TO authenticated
USING (is_active = true);

-- 2. INSERT Policy: Authenticated users can insert (for registration)
-- We trust the application logic to set correct tenant_id
CREATE POLICY "authenticated_users_can_insert"
ON users FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = auth_user_id::text);

-- 3. UPDATE Policy: Users can only update their own record
CREATE POLICY "users_can_update_own"
ON users FOR UPDATE
TO authenticated
USING (auth.uid()::text = auth_user_id::text)
WITH CHECK (auth.uid()::text = auth_user_id::text);

-- 4. DELETE Policy: Only service role can delete (soft delete preferred in app)
-- No policy needed - defaults to deny for authenticated users
-- Service role bypasses RLS anyway

-- Verify policies
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY cmd, policyname;

-- Note: We removed tenant-based access control from RLS policies
-- because it caused recursion. Instead, the application layer
-- will handle tenant filtering in queries.

