-- Fix RLS Policies for users table to resolve 406 errors
-- Ensures authenticated users can read/write their own data and relevant tenant data

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can read tenant users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert during registration" ON users;
DROP POLICY IF EXISTS "Admins can read all tenant users" ON users;
DROP POLICY IF EXISTS "Admins can update tenant users" ON users;
DROP POLICY IF EXISTS "Staff can read tenant users" ON users;

-- Enable RLS if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policies
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
ON users FOR SELECT
TO authenticated
USING (
  auth.uid()::text = auth_user_id::text
);

-- Users can read other users in the same tenant (for admin/staff features)
CREATE POLICY "Users can read tenant users"
ON users FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id 
    FROM users 
    WHERE auth_user_id::text = auth.uid()::text
    AND is_active = true
  )
);

-- 2. INSERT Policies
-- Allow user creation during registration (authenticated users can insert)
CREATE POLICY "Users can insert during registration"
ON users FOR INSERT
TO authenticated
WITH CHECK (
  -- User can insert their own record
  auth.uid()::text = auth_user_id::text
  OR
  -- Or admin/staff can create users for their tenant
  EXISTS (
    SELECT 1 FROM users
    WHERE auth_user_id::text = auth.uid()::text
    AND role IN ('admin', 'staff')
    AND is_active = true
  )
);

-- 3. UPDATE Policies  
-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
TO authenticated
USING (auth.uid()::text = auth_user_id::text)
WITH CHECK (auth.uid()::text = auth_user_id::text);

-- Admins can update users in their tenant
CREATE POLICY "Admins can update tenant users"
ON users FOR UPDATE
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id 
    FROM users 
    WHERE auth_user_id::text = auth.uid()::text
    AND role = 'admin'
    AND is_active = true
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id 
    FROM users 
    WHERE auth_user_id::text = auth.uid()::text
    AND role = 'admin'
    AND is_active = true
  )
);

-- 4. DELETE Policies (Soft delete preferred, but allow for cleanup)
DROP POLICY IF EXISTS "Admins can delete tenant users" ON users;
CREATE POLICY "Admins can delete tenant users"
ON users FOR DELETE
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id 
    FROM users 
    WHERE auth_user_id::text = auth.uid()::text
    AND role = 'admin'
    AND is_active = true
  )
);

-- Verify policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

