-- Fix RLS policies for payments table to allow staff to read payment data in edit mode

-- 1. Enable RLS on payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies
DROP POLICY IF EXISTS payments_tenant_access ON payments;
DROP POLICY IF EXISTS payments_select_policy ON payments;
DROP POLICY IF EXISTS payments_insert_policy ON payments;
DROP POLICY IF EXISTS payments_update_policy ON payments;
DROP POLICY IF EXISTS payments_delete_policy ON payments;

-- 3. Create comprehensive policies for authenticated users

-- SELECT: Users can view payments in their tenant
CREATE POLICY payments_select_policy ON payments
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- INSERT: Users can create payments in their tenant
CREATE POLICY payments_insert_policy ON payments
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- UPDATE: Users can update payments in their tenant
CREATE POLICY payments_update_policy ON payments
  FOR UPDATE TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- DELETE: Staff and admins can delete payments in their tenant
CREATE POLICY payments_delete_policy ON payments
  FOR DELETE TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'staff')
    )
  );

-- 4. Verify the policies are created
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'payments'
ORDER BY policyname;

