-- Simple fix for tenants RLS policies
-- This allows all authenticated users to see tenants

-- 1) Drop existing policies if they exist
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenants_access') THEN
    DROP POLICY tenants_access ON tenants;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenants_super_admin_access') THEN
    DROP POLICY tenants_super_admin_access ON tenants;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenants_tenant_admin_access') THEN
    DROP POLICY tenants_tenant_admin_access ON tenants;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenants_authenticated_access') THEN
    DROP POLICY tenants_authenticated_access ON tenants;
  END IF;
END $$;

-- 2) Create simple policy that allows all authenticated users to see tenants
CREATE POLICY tenants_authenticated_access ON tenants
  FOR ALL
  TO authenticated
  USING (true);

-- 3) Verify the policy was created
SELECT policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'tenants';
