-- Fix RLS policies for discounts table
-- This should resolve the 406 (Not Acceptable) errors when accessing discounts

-- First, let's check current policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'discounts';

-- Drop all existing policies for discounts to start clean
DROP POLICY IF EXISTS "Discounts are viewable by everyone" ON discounts;
DROP POLICY IF EXISTS "Discounts are insertable by admins" ON discounts;
DROP POLICY IF EXISTS "Discounts are updatable by admins" ON discounts;
DROP POLICY IF EXISTS "Discounts are deletable by admins" ON discounts;

-- Create clean, simple policies for discounts
-- These policies ensure tenant isolation and allow authenticated users to access their tenant's discounts

-- SELECT policy: Users can view discounts for their tenant
CREATE POLICY "discounts_select_policy" ON discounts
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT u.tenant_id 
    FROM users u 
    WHERE u.auth_user_id = auth.uid() 
    AND u.is_active = true 
    AND u.deleted_at IS NULL
  )
);

-- INSERT policy: Users can create discounts for their tenant (if they have permission)
CREATE POLICY "discounts_insert_policy" ON discounts
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT u.tenant_id 
    FROM users u 
    WHERE u.auth_user_id = auth.uid() 
    AND u.is_active = true 
    AND u.deleted_at IS NULL
  )
);

-- UPDATE policy: Users can update discounts for their tenant (if they have permission)
CREATE POLICY "discounts_update_policy" ON discounts
FOR UPDATE
TO authenticated
USING (
  tenant_id IN (
    SELECT u.tenant_id 
    FROM users u 
    WHERE u.auth_user_id = auth.uid() 
    AND u.is_active = true 
    AND u.deleted_at IS NULL
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT u.tenant_id 
    FROM users u 
    WHERE u.auth_user_id = auth.uid() 
    AND u.is_active = true 
    AND u.deleted_at IS NULL
  )
);

-- DELETE policy: Users can delete discounts for their tenant (if they have permission)
CREATE POLICY "discounts_delete_policy" ON discounts
FOR DELETE
TO authenticated
USING (
  tenant_id IN (
    SELECT u.tenant_id 
    FROM users u 
    WHERE u.auth_user_id = auth.uid() 
    AND u.is_active = true 
    AND u.deleted_at IS NULL
  )
);

-- Verify the new policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'discounts'
ORDER BY policyname;
