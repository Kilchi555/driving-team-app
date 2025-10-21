-- Fix RLS Policy for users table INSERT to allow staff/admin to create students
-- This fixes the 403 error when adding new students

-- Drop existing INSERT policies
DROP POLICY IF EXISTS "Users can insert during registration" ON users;
DROP POLICY IF EXISTS "Allow admins to insert users" ON users;
DROP POLICY IF EXISTS "authenticated_users_can_insert" ON users;
DROP POLICY IF EXISTS "Staff can insert users" ON users;

-- Create a new INSERT policy that allows:
-- 1. Users to create their own profile (self-registration)
-- 2. Staff/Admin to create users in their tenant
CREATE POLICY "Allow staff and admin to insert users in their tenant" ON users
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    -- Self-registration: User creates their own profile
    (auth.uid()::text = auth_user_id::text)
    OR
    -- Staff/Admin creating users: Must be in the same tenant
    (
      EXISTS (
        SELECT 1 FROM users AS staff_user
        WHERE staff_user.auth_user_id = auth.uid()
        AND staff_user.role IN ('admin', 'staff')
        AND staff_user.is_active = true
        AND staff_user.tenant_id = users.tenant_id  -- New user must be in same tenant
      )
    )
  );

-- Verify the policy
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd,
  with_check
FROM pg_policies 
WHERE tablename = 'users' 
AND cmd = 'INSERT'
ORDER BY policyname;

