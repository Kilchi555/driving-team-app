-- Comprehensive RLS Check for all tables
-- This query shows which tables have RLS enabled and which don't

SELECT 
  schemaname,
  tablename,
  rowsecurity,
  CASE 
    WHEN rowsecurity = true THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END AS rls_status,
  -- Count policies for each table
  (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) AS policy_count
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY 
  CASE WHEN rowsecurity = false THEN 0 ELSE 1 END,
  tablename;

-- Show detailed policy information for tables with policies
SELECT 
  tablename,
  policyname,
  cmd,
  roles::text,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- Show all tables that DON'T have RLS enabled
SELECT 
  schemaname,
  tablename,
  'RLS NOT ENABLED' AS warning
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = false
ORDER BY tablename;

