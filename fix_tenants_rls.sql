-- Fix RLS policies for tenants table to allow access for all authenticated users
-- This ensures that the tenant admin can see all tenants

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
END $$;

-- 2) Create simple policy that allows all authenticated users to see tenants
CREATE POLICY tenants_authenticated_access ON tenants
  FOR ALL
  TO authenticated
  USING (true);

-- 3) Also check if there are any other restrictive policies
DO $$ 
DECLARE
  rec RECORD;
BEGIN
  -- List all policies on tenants table
  RAISE NOTICE 'Current policies on tenants table:';
  FOR rec IN 
    SELECT policyname, permissive, roles, cmd, qual 
    FROM pg_policies 
    WHERE tablename = 'tenants'
  LOOP
    RAISE NOTICE 'Policy: %, Permissive: %, Roles: %, CMD: %, Qual: %', 
      rec.policyname, rec.permissive, rec.roles, rec.cmd, rec.qual;
  END LOOP;
END $$;
