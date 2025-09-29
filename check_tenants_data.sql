-- Check if tenants table exists and has data
-- This will help us understand what's happening

-- 1) Check if tenants table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'tenants'
) as table_exists;

-- 2) Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tenants'
ORDER BY ordinal_position;

-- 3) Check if there are any tenants (bypassing RLS)
SET row_security = off;
SELECT COUNT(*) as total_tenants FROM tenants;
SET row_security = on;

-- 4) Check RLS policies on tenants table
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'tenants';

-- 5) If no tenants exist, create a default one
INSERT INTO tenants (id, name, slug, is_active, is_trial, subscription_plan, subscription_status)
SELECT 
  gen_random_uuid(),
  'Driving Team',
  'driving-team',
  true,
  false,
  'premium',
  'active'
WHERE NOT EXISTS (SELECT 1 FROM tenants);

-- 6) Show the result
SELECT * FROM tenants;
