-- Check RLS on tenants table and if Wallee columns are readable

-- 1. Check if tenants has RLS enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename = 'tenants';

-- 2. Check existing policies for tenants
SELECT 
  tablename,
  policyname,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'tenants'
ORDER BY policyname;

-- 3. Check actual Wallee values for your tenant
SELECT 
  id,
  name,
  wallee_space_id,
  wallee_user_id,
  CASE 
    WHEN wallee_secret_key IS NOT NULL THEN 'SET (hidden)'
    ELSE 'NULL'
  END as wallee_secret_key_status
FROM public.tenants
WHERE id = '64259d68-195a-4c68-8875-f1b44d962830';

