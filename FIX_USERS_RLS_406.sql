-- EMERGENCY FIX: Users Table RLS Issue
-- Problem: 406 Not Acceptable when staff tries to read users
-- Solution: Add policy for staff to read users they manage

-- First, check current policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- Solution: Add SELECT policy for staff/admin to read other users
-- This allows staff to load student data for editing

CREATE POLICY "Staff can read users in their tenant" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.auth_user_id = auth.uid()
      AND u.role IN ('admin', 'staff', 'super_admin')
      AND u.tenant_id = users.tenant_id
    )
  );

-- Alternative simpler version if above doesn't work:
-- Allow authenticated users to read other users in same tenant
CREATE POLICY "Authenticated users can read tenant members" ON users
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND tenant_id = (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  );

-- After applying one of these policies, test with:
SELECT id, email, first_name, last_name FROM users LIMIT 1;

