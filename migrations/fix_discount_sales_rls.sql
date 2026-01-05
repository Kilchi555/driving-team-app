-- Fix RLS policies for discount_sales table
-- Allow authenticated users (staff/admins) and service_role to access their tenant's discount_sales

-- Drop existing policies first
DROP POLICY IF EXISTS "Service role full access" ON discount_sales;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON discount_sales;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON discount_sales;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON discount_sales;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON discount_sales;
DROP POLICY IF EXISTS "Service role delete discount_sales" ON discount_sales;
DROP POLICY IF EXISTS "Service role insert discount_sales" ON discount_sales;
DROP POLICY IF EXISTS "Service role read discount_sales" ON discount_sales;
DROP POLICY IF EXISTS "Service role update discount_sales" ON discount_sales;
DROP POLICY IF EXISTS "discount_sales_tenant_access" ON discount_sales;
DROP POLICY IF EXISTS "Discount sales select" ON discount_sales;
DROP POLICY IF EXISTS "Discount sales insert" ON discount_sales;
DROP POLICY IF EXISTS "Discount sales update" ON discount_sales;
DROP POLICY IF EXISTS "Users can read discount sales" ON discount_sales;

-- Enable RLS
ALTER TABLE discount_sales ENABLE ROW LEVEL SECURITY;

-- Policy 1: Service role has full access (for APIs)
CREATE POLICY "service_role_all_access" ON discount_sales
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy 2: Authenticated users (staff/admins) can read/write within their tenant
CREATE POLICY "authenticated_tenant_access" ON discount_sales
  FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE auth.uid() = users.auth_user_id
      AND users.role IN ('staff', 'admin', 'tenant_admin')
      AND users.is_active = true
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE auth.uid() = users.auth_user_id
      AND users.role IN ('staff', 'admin', 'tenant_admin')
      AND users.is_active = true
    )
  );

-- Verify policies
SELECT tablename, policyname, cmd FROM pg_policies
WHERE tablename = 'discount_sales'
ORDER BY policyname;
