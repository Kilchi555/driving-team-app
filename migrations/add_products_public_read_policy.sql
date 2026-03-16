-- Allow anonymous/public read access to active products
-- Required for the public shop page (/shop) which loads products without auth
-- The query must always filter by tenant_id, limiting exposure to one tenant

-- Enable RLS if not already enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Drop any conflicting policies
DROP POLICY IF EXISTS "products_public_read" ON products;
DROP POLICY IF EXISTS "products_anon_read" ON products;
DROP POLICY IF EXISTS "products_select_anon" ON products;

-- Policy 1: Anyone (anon + authenticated) can read active products
-- Safe because products are public shop information
CREATE POLICY "products_public_read" ON products
  FOR SELECT
  USING (is_active = true);

-- Policy 2: Admins can manage products for their own tenant
DROP POLICY IF EXISTS "products_admin_manage" ON products;
CREATE POLICY "products_admin_manage" ON products
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('admin', 'tenant_admin', 'super_admin')
        AND u.tenant_id = products.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('admin', 'tenant_admin', 'super_admin')
        AND u.tenant_id = products.tenant_id
    )
  );

-- Verify
SELECT policyname, cmd, roles, qual
FROM pg_policies
WHERE tablename = 'products'
ORDER BY policyname;
