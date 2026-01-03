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
  CASE 
    WHEN 'service_role'::regrole = ANY(roles) THEN 'service_role'
    WHEN 'authenticated'::regrole = ANY(roles) THEN 'authenticated'
    WHEN 'anon'::regrole = ANY(roles) THEN '🔴 ANON (DANGER!)'
    ELSE roles::text
  END as roles,
  SUBSTR(qual, 1, 100) as condition
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- TABLE 2: appointments
-- EXPECTED: Self-read for customers + staff/admin read within tenant + service_role bypass
SELECT 
  'APPOINTMENTS' as table_name,
  policyname,
  cmd,
  CASE 
    WHEN 'service_role'::regrole = ANY(roles) THEN 'service_role'
    WHEN 'authenticated'::regrole = ANY(roles) THEN 'authenticated'
    WHEN 'anon'::regrole = ANY(roles) THEN '🔴 ANON (DANGER!)'
    ELSE roles::text
  END as roles,
  SUBSTR(qual, 1, 100) as condition
FROM pg_policies
WHERE tablename = 'appointments'
ORDER BY policyname;

-- TABLE 3: payments
-- EXPECTED: Self-read for customers + staff/admin read within tenant + service_role bypass
SELECT 
  'PAYMENTS' as table_name,
  policyname,
  cmd,
  CASE 
    WHEN 'service_role'::regrole = ANY(roles) THEN 'service_role'
    WHEN 'authenticated'::regrole = ANY(roles) THEN 'authenticated'
    WHEN 'anon'::regrole = ANY(roles) THEN '🔴 ANON (DANGER!)'
    ELSE roles::text
  END as roles,
  SUBSTR(qual, 1, 100) as condition
FROM pg_policies
WHERE tablename = 'payments'
ORDER BY policyname;

-- SUMMARY: Count of policies by table and role
SELECT 
  tablename,
  COUNT(*) as total_policies,
  COUNT(CASE WHEN 'anon'::regrole = ANY(roles) THEN 1 END) as "🔴 ANON",
  COUNT(CASE WHEN 'service_role'::regrole = ANY(roles) THEN 1 END) as "✅ service_role",
  COUNT(CASE WHEN 'authenticated'::regrole = ANY(roles) THEN 1 END) as "✅ authenticated",
  CASE 
    WHEN COUNT(CASE WHEN 'anon'::regrole = ANY(roles) THEN 1 END) > 0 THEN '🔴 PROBLEM: Anon can access!'
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

