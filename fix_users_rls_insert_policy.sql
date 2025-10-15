-- Fix the INSERT policy for users table
-- The current policy has qual: null which makes it ineffective

-- Drop the broken INSERT policy
DROP POLICY IF EXISTS "Allow admins to insert users" ON users;

-- Create a proper INSERT policy with WITH CHECK condition
CREATE POLICY "Allow admins to insert users" ON users
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND (
      -- Admins can create users
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.auth_user_id = auth.uid()
        AND users.role = 'admin'
      )
    )
  );

-- Verify the fixed policy
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'users' 
AND policyname = 'Allow admins to insert users';
