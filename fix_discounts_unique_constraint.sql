-- Fix discounts table unique constraint to be per-tenant instead of global
-- This allows different tenants to use the same discount codes

-- First, add soft delete columns to discounts table if they don't exist
ALTER TABLE discounts 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id) DEFAULT NULL;

-- Ensure is_active column has a default value of true
ALTER TABLE discounts ALTER COLUMN is_active SET DEFAULT true;

-- Add index for better performance on soft delete queries
CREATE INDEX IF NOT EXISTS idx_discounts_deleted_at ON discounts(deleted_at);

-- Drop the existing unique constraint
ALTER TABLE discounts DROP CONSTRAINT IF EXISTS discounts_code_key;

-- Create a new unique constraint that combines tenant_id and code
-- This allows the same code to exist for different tenants
CREATE UNIQUE INDEX discounts_tenant_code_unique 
ON discounts (tenant_id, code) 
WHERE deleted_at IS NULL; -- Only enforce uniqueness for non-deleted discounts

-- Add a comment to document the change
COMMENT ON INDEX discounts_tenant_code_unique IS 'Ensures discount codes are unique per tenant, allowing different tenants to use the same codes';

-- Update RLS policies to ensure proper tenant isolation
-- Drop existing policies
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
