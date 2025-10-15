-- Fix RLS policies for users table to allow admin enrollment operations
-- This will allow admins to create and read users for course enrollment

-- First, check current RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY policyname;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to view users" ON users;
DROP POLICY IF EXISTS "Allow staff to view users" ON users;

-- Create comprehensive policies for users table

-- Policy 1: Allow all authenticated users to view users (for enrollment and general access)
CREATE POLICY "Allow authenticated users to view users" ON users
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy 2: Allow admins to insert users (for course enrollment)
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

-- Policy 3: Allow admins to update users
CREATE POLICY "Allow admins to update users" ON users
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND (
      -- Admins can update any user
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.auth_user_id = auth.uid()
        AND users.role = 'admin'
      )
    )
  );

-- Policy 4: Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND (
      -- Users can update their own profile
      auth_user_id = auth.uid()
    )
  );

-- Policy 5: Allow admins to delete users (if needed)
CREATE POLICY "Allow admins to delete users" ON users
  FOR DELETE USING (
    auth.role() = 'authenticated' AND (
      -- Admins can delete users
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.auth_user_id = auth.uid()
        AND users.role = 'admin'
      )
    )
  );

-- Verify the new policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY policyname;
