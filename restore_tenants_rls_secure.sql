-- Restore RLS on tenants table with proper security policies
-- This ensures data security while allowing necessary access

-- 1) Re-enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- 2) Drop any existing policies
DO $$ 
DECLARE
  rec RECORD;
BEGIN
  -- Drop all existing policies on tenants table
  FOR rec IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'tenants'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || rec.policyname || ' ON tenants';
  END LOOP;
END $$;

-- 3) Create secure policies
-- Allow authenticated users to read tenants (for admin dashboard)
CREATE POLICY tenants_read_authenticated ON tenants
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow super_admin role to manage tenants
CREATE POLICY tenants_manage_super_admin ON tenants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
  );

-- Allow admin role to read and update their tenant
CREATE POLICY tenants_manage_admin ON tenants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.tenant_id = tenants.id
    )
  );

-- 4) Verify RLS is enabled and policies exist
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'tenants';

-- 5) Show all policies
SELECT 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'tenants';

-- 6) Test access (should work for authenticated users)
SELECT COUNT(*) as accessible_tenants FROM tenants;
