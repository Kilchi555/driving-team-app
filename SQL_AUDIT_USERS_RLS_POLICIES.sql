-- =====================================================
-- AUDIT: Current users Table RLS Policies
-- =====================================================
-- Run this in Supabase SQL Editor to see ALL current policies

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual as "Row Security Expression (SELECT/WHERE)",
  with_check as "Row Security Expression (INSERT/UPDATE/CHECK)"
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- =====================================================
-- ALTERNATIVE: More detailed view with policy types
-- =====================================================

SELECT 
  p.policyname,
  p.cmd as "Operation (SELECT/INSERT/UPDATE/DELETE)",
  p.permissive as "Permissive/Restrictive",
  p.roles as "Roles",
  CASE 
    WHEN p.cmd = 'SELECT' THEN 'USING (FOR SELECT)'
    WHEN p.cmd = 'INSERT' THEN 'WITH CHECK (FOR INSERT)'
    WHEN p.cmd = 'UPDATE' THEN 'USING (check existing rows) / WITH CHECK (check new values)'
    WHEN p.cmd = 'DELETE' THEN 'USING (FOR DELETE)'
  END as "Clause Type",
  p.qual as "Condition",
  p.with_check as "With Check Condition"
FROM pg_policies p
WHERE p.tablename = 'users'
ORDER BY p.policyname, p.cmd;

-- =====================================================
-- CHECK: Are there any policies that allow anon?
-- =====================================================

SELECT 
  policyname,
  roles::text as "Roles",
  cmd,
  CASE 
    WHEN 'anon'::regrole = ANY(roles) THEN '⚠️ ALLOWS ANON'
    ELSE '✅ Anon blocked'
  END as "Anon Access",
  qual
FROM pg_policies
WHERE tablename = 'users';

-- =====================================================
-- SUMMARY: Count policies by role
-- =====================================================

SELECT 
  roles as "Role",
  cmd as "Operation",
  COUNT(*) as "Policy Count"
FROM pg_policies
WHERE tablename = 'users'
GROUP BY roles, cmd
ORDER BY roles, cmd;

-- =====================================================
-- TEST: Try to read users as different roles
-- (This will show what each role can actually access)
-- =====================================================

-- Run as: authenticated user (your current session)
SELECT id, email, first_name, last_name FROM users LIMIT 5;

-- Run as: service_role (if possible)
-- set role to service_role;
-- SELECT id, email, first_name, last_name FROM users LIMIT 5;

-- Run as: anon (if possible)
-- set role to anon;
-- SELECT id, email, first_name, last_name FROM users LIMIT 5;
-- Should return: ERROR: new row violates row-level security policy

