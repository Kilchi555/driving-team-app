-- =====================================================
-- AUDIT: Check RLS Status on ALL Customer Tables
-- =====================================================

-- 1. Check which tables EXIST and RLS status
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as "RLS_Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 2. Count policies per table
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 3. Show tables WITH RLS but NO policies (VULNERABLE!)
SELECT DISTINCT
  t.tablename,
  t.rowsecurity
FROM pg_tables t
WHERE t.schemaname = 'public'
AND t.rowsecurity = true
AND t.tablename NOT IN (
  SELECT DISTINCT tablename FROM pg_policies WHERE schemaname = 'public'
)
ORDER BY t.tablename;

-- 4. Show tables WITHOUT RLS (VERY VULNERABLE!)
SELECT DISTINCT
  t.tablename,
  t.rowsecurity
FROM pg_tables t
WHERE t.schemaname = 'public'
AND t.rowsecurity = false
AND t.tablename NOT LIKE 'pg_%'
AND t.tablename NOT LIKE 'sql_%'
ORDER BY t.tablename;

