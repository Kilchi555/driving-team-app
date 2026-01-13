-- =====================================================
-- AUDIT RLS POLICIES: users, appointments, payments
-- =====================================================
-- Run this in Supabase SQL Editor to see current policies

-- TABLE 1: users
-- EXPECTED: Self-read only + service_role bypass + superadmin access
SELECT 
  'USERS' as table_name,
  policyname,
  cmd,
  roles::text,
  SUBSTR(qual, 1, 100) as condition,
  CASE 
    WHEN roles::text LIKE '%service_role%' THEN '✅ service_role'
    WHEN roles::text LIKE '%authenticated%' THEN '✅ authenticated'
    WHEN roles::text LIKE '%anon%' THEN '🔴 ANON (DANGER!)'
    ELSE '❓ other'
  END as role_assessment
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- TABLE 2: appointments
-- EXPECTED: Self-read for customers + staff/admin read within tenant + service_role bypass
SELECT 
  'APPOINTMENTS' as table_name,
  policyname,
  cmd,
  roles::text,
  SUBSTR(qual, 1, 100) as condition,
  CASE 
    WHEN roles::text LIKE '%service_role%' THEN '✅ service_role'
    WHEN roles::text LIKE '%authenticated%' THEN '✅ authenticated'
    WHEN roles::text LIKE '%anon%' THEN '🔴 ANON (DANGER!)'
    ELSE '❓ other'
  END as role_assessment
FROM pg_policies
WHERE tablename = 'appointments'
ORDER BY policyname;

-- TABLE 3: payments
-- EXPECTED: Self-read for customers + staff/admin read within tenant + service_role bypass
SELECT 
  'PAYMENTS' as table_name,
  policyname,
  cmd,
  roles::text,
  SUBSTR(qual, 1, 100) as condition,
  CASE 
    WHEN roles::text LIKE '%service_role%' THEN '✅ service_role'
    WHEN roles::text LIKE '%authenticated%' THEN '✅ authenticated'
    WHEN roles::text LIKE '%anon%' THEN '🔴 ANON (DANGER!)'
    ELSE '❓ other'
  END as role_assessment
FROM pg_policies
WHERE tablename = 'payments'
ORDER BY policyname;

-- SUMMARY: Count of policies by table and role
SELECT 
  tablename,
  COUNT(*) as total_policies,
  COUNT(CASE WHEN roles::text LIKE '%anon%' THEN 1 END) as "🔴 ANON",
  COUNT(CASE WHEN roles::text LIKE '%service_role%' THEN 1 END) as "✅ service_role",
  COUNT(CASE WHEN roles::text LIKE '%authenticated%' THEN 1 END) as "✅ authenticated",
  CASE 
    WHEN COUNT(CASE WHEN roles::text LIKE '%anon%' THEN 1 END) > 0 THEN '🔴 PROBLEM: Anon can access!'
    ELSE '✅ OK: Anon blocked'
  END as risk_assessment
FROM pg_policies
WHERE tablename IN ('users', 'appointments', 'payments')
GROUP BY tablename
ORDER BY tablename;

-- DETAILED: Full policy content
SELECT 
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('users', 'appointments', 'payments')
ORDER BY tablename, policyname;

