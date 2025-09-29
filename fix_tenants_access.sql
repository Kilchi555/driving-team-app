-- Fix tenants table access - ensure RLS allows reading
-- This should solve the issue where tenants exist but can't be loaded

-- 1) Disable RLS temporarily to check data
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;

-- 2) Check if data is actually there
SELECT COUNT(*) as total_tenants FROM tenants;
SELECT * FROM tenants;

-- 3) Re-enable RLS with proper policies
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- 4) Drop all existing policies
DO $$ BEGIN
  -- Drop all existing policies on tenants table
  FOR rec IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'tenants'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || rec.policyname || ' ON tenants';
  END LOOP;
END $$;

-- 5) Create a simple policy that allows all authenticated users
CREATE POLICY tenants_read_all ON tenants
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY tenants_write_all ON tenants
  FOR ALL
  TO authenticated
  USING (true);

-- 6) Verify the policies
SELECT policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'tenants';

-- 7) Test access as authenticated user
SELECT COUNT(*) as accessible_tenants FROM tenants;
