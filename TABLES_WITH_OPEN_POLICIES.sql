-- Find all tables where we have "permissive" policies (might be Service Role friendly)

-- These queries help identify which tables have policies that might be too open
-- and could be vulnerable if not properly secured at the application level

-- Query 1: All tables with their RLS status and policy count
SELECT 
  t.tablename,
  t.rowsecurity as "RLS Enabled",
  COUNT(p.policyname) as "Policy Count",
  STRING_AGG(p.policyname, ', ' ORDER BY p.policyname) as "Policies"
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE 'pg_%'
  AND t.tablename NOT LIKE 'information_schema%'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.rowsecurity DESC, t.tablename;

-- Query 2: Find "open" policies (qual = 'true')
SELECT 
  tablename,
  policyname,
  permissive,
  qual as "Policy Condition",
  'FULLY OPEN ⚠️' as "Security Level"
FROM pg_policies
WHERE schemaname = 'public'
  AND qual = 'true'
ORDER BY tablename;

-- Query 3: Tables that might have Service Role issues
-- Check these specific tables we know use getSupabaseAdmin()
SELECT 
  schemaname,
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(policyname, '; ') as policies,
  STRING_AGG(
    CASE WHEN qual = 'true' THEN '🔓 ' || policyname ELSE '✅ ' || policyname END,
    '; '
  ) as policy_details
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'payments',
    'webhook_logs',
    'course_registrations',
    'appointments',
    'audit_logs',
    'external_calendars',
    'staff_locations',
    'availability_slots',
    'locations',
    'working_hours',
    'invoices'
  )
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Query 4: Count tables by security level
WITH policy_analysis AS (
  SELECT 
    t.tablename,
    COUNT(p.policyname) as policy_count,
    COUNT(CASE WHEN p.qual = 'true' THEN 1 END) as open_policies,
    CASE 
      WHEN NOT t.rowsecurity THEN 'No RLS'
      WHEN COUNT(p.policyname) = 0 THEN 'RLS but no policies ⚠️'
      WHEN COUNT(CASE WHEN p.qual = 'true' THEN 1 END) > 0 THEN 'Has open policies ⚠️'
      ELSE 'Restricted'
    END as security_level
  FROM pg_tables t
  LEFT JOIN pg_policies p ON t.tablename = p.tablename
  WHERE t.schemaname = 'public'
    AND t.tablename NOT LIKE 'pg_%'
  GROUP BY t.tablename, t.rowsecurity
)
SELECT 
  security_level,
  COUNT(*) as table_count,
  STRING_AGG(tablename, ', ' ORDER BY tablename) as tables
FROM policy_analysis
GROUP BY security_level
ORDER BY table_count DESC;
