-- Find all RLS policies that allow Service Role access
-- Service Role bypasses RLS, but we should track policies that are designed for it

-- 1. Find policies with qual = 'true' (completely permissive)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  'PERMISSIVE - Always True' as policy_type
FROM pg_policies
WHERE qual = 'true'
  AND schemaname = 'public'
ORDER BY tablename, policyname;

-- 2. Find policies that mention 'service' or 'public' role
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  CASE 
    WHEN qual LIKE '%auth.uid()%' THEN 'Auth-based'
    WHEN qual LIKE '%true%' THEN 'Always True (Service friendly)'
    ELSE 'Other'
  END as policy_type
FROM pg_policies
WHERE (policyname ILIKE '%service%' OR policyname ILIKE '%public%')
  AND schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Summary: Count permissive policies by table
SELECT 
  tablename,
  COUNT(*) as total_policies,
  COUNT(CASE WHEN qual = 'true' THEN 1 END) as permissive_count,
  COUNT(CASE WHEN qual != 'true' THEN 1 END) as restricted_count,
  STRING_AGG(policyname, ', ') as policy_names
FROM pg_policies
WHERE schemaname = 'public'
  AND rowsecurity = true
GROUP BY tablename
ORDER BY tablename;

-- 4. Check which tables have RLS enabled and their policy count
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as policy_count
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
ORDER BY rowsecurity DESC, tablename;

-- 5. CRITICAL: Find tables with RLS but NO policies (accidentally locked!)
SELECT 
  tablename,
  'NO POLICIES!' as warning
FROM pg_tables pt
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND rowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies pp
    WHERE pp.tablename = pt.tablename
  )
ORDER BY tablename;
