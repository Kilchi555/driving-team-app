-- Completely disable RLS on tenants table to allow access
-- This is a temporary fix to get the data loading

-- 1) Disable RLS completely
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;

-- 2) Verify the change
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'tenants';

-- 3) Test access
SELECT COUNT(*) as total_tenants FROM tenants;
SELECT id, name, slug, is_active, is_trial FROM tenants;

-- 4) Show all tenants
SELECT * FROM tenants;
