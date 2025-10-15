-- Fix RLS policies for discounts table to resolve 406 Not Acceptable errors
-- This addresses the issue where GET requests to discounts table were being blocked

-- Drop existing policies that might be causing conflicts
DROP POLICY IF EXISTS "Users can view discounts for their tenant" ON discounts;
DROP POLICY IF EXISTS "Admins can manage discounts for their tenant" ON discounts;
DROP POLICY IF EXISTS "Allow authenticated users to insert discounts" ON discounts;
DROP POLICY IF EXISTS "Allow read access to discounts for authenticated users" ON discounts;
DROP POLICY IF EXISTS "Allow authenticated users to create discounts" ON discounts;
DROP POLICY IF EXISTS "Allow authenticated users to update discounts" ON discounts;
DROP POLICY IF EXISTS "Allow authenticated users to delete discounts" ON discounts;

-- Create comprehensive policies for all operations
-- SELECT policy - all authenticated users can view their tenant's discounts
CREATE POLICY "Allow read access to discounts for authenticated users" ON discounts
FOR SELECT USING (
  auth.role() = 'authenticated' AND
  tenant_id = (
    SELECT tenant_id FROM users 
    WHERE auth_user_id = auth.uid()
  ) AND
  deleted_at IS NULL
);

-- INSERT policy - authenticated users can create discounts for their tenant
CREATE POLICY "Allow authenticated users to create discounts" ON discounts
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  tenant_id = (
    SELECT tenant_id FROM users 
    WHERE auth_user_id = auth.uid()
  )
);

-- UPDATE policy - authenticated users can update their tenant's discounts
CREATE POLICY "Allow authenticated users to update discounts" ON discounts
FOR UPDATE USING (
  auth.role() = 'authenticated' AND
  tenant_id = (
    SELECT tenant_id FROM users 
    WHERE auth_user_id = auth.uid()
  )
) WITH CHECK (
  auth.role() = 'authenticated' AND
  tenant_id = (
    SELECT tenant_id FROM users 
    WHERE auth_user_id = auth.uid()
  )
);

-- DELETE policy - authenticated users can soft delete their tenant's discounts
CREATE POLICY "Allow authenticated users to delete discounts" ON discounts
FOR DELETE USING (
  auth.role() = 'authenticated' AND
  tenant_id = (
    SELECT tenant_id FROM users 
    WHERE auth_user_id = auth.uid()
  ) AND
  deleted_at IS NULL
);

-- Enable RLS if not already enabled
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
