-- Fix RLS policies for invited_customers table
-- This should resolve the 406 (Not Acceptable) errors

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
WHERE tablename = 'invited_customers';

-- Drop all existing policies for invited_customers to start clean
DROP POLICY IF EXISTS "invited_customers_delete_policy" ON invited_customers;
DROP POLICY IF EXISTS "invited_customers_insert_policy" ON invited_customers;
DROP POLICY IF EXISTS "invited_customers_select_policy" ON invited_customers;
DROP POLICY IF EXISTS "invited_customers_tenant_access" ON invited_customers;
DROP POLICY IF EXISTS "invited_customers_update_policy" ON invited_customers;

-- Create clean, simple policies for invited_customers
-- These policies ensure tenant isolation and allow authenticated users to manage their tenant's data

-- SELECT policy: Users can view invited_customers for their tenant
CREATE POLICY "invited_customers_select_policy" ON invited_customers
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

-- INSERT policy: Users can create invited_customers for their tenant
CREATE POLICY "invited_customers_insert_policy" ON invited_customers
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

-- UPDATE policy: Users can update invited_customers for their tenant
CREATE POLICY "invited_customers_update_policy" ON invited_customers
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

-- DELETE policy: Users can delete invited_customers for their tenant
CREATE POLICY "invited_customers_delete_policy" ON invited_customers
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
WHERE tablename = 'invited_customers'
ORDER BY policyname;
