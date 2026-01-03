-- =====================================================
-- SUPABASE MIGRATION STATUS CHECK
-- =====================================================
-- Use this to see which migrations have been applied

-- Check if there's a migration tracking table
SELECT * FROM pg_tables 
WHERE schemaname = 'supabase_migrations' 
OR tablename = 'schema_migrations';

-- If supabase uses migrations, they might be here:
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY name DESC 
LIMIT 20;

-- =====================================================
-- CURRENT RLS STATE: Full Audit
-- =====================================================

WITH rls_audit AS (
  SELECT 
    p.policyname,
    p.cmd,
    p.roles::text as role_list,
    CASE 
      WHEN 'anon'::regrole = ANY(p.roles) THEN '⚠️ ANON_CAN_ACCESS'
      WHEN 'authenticated'::regrole = ANY(p.roles) THEN '✅ Authenticated Only'
      WHEN 'service_role'::regrole = ANY(p.roles) THEN '✅ Service Role (Backend)'
      ELSE '❓ Custom Role'
    END as "Access Level",
    LENGTH(p.qual) as "Condition Complexity (chars)",
    SUBSTR(p.qual, 1, 80) as "Condition Preview"
  FROM pg_policies p
  WHERE p.tablename = 'users'
)
SELECT 
  policyname,
  cmd,
  role_list,
  "Access Level",
  "Condition Complexity (chars)",
  "Condition Preview"
FROM rls_audit
ORDER BY policyname;

-- =====================================================
-- RISK ASSESSMENT: Is users table secure?
-- =====================================================

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'users' 
      AND 'anon'::regrole = ANY(roles)
    ) THEN '🔴 CRITICAL: Anon can access users table!'
    ELSE '✅ Good: Anon cannot access users'
  END as "Anon Access Risk",
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'users' 
      AND cmd = 'SELECT'
    ) THEN '✅ SELECT policies exist'
    ELSE '❌ No SELECT policies found'
  END as "SELECT Policies",
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'users' 
      AND 'service_role'::regrole = ANY(roles)
    ) THEN '✅ Service role has bypass'
    ELSE '❌ No service role bypass found'
  END as "Service Role Bypass",
  
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'users') as "Total Policy Count"
;

-- =====================================================
-- FIND PROBLEMATIC POLICIES: Overly Permissive
-- =====================================================

SELECT 
  policyname,
  cmd,
  roles,
  qual,
  CASE 
    WHEN qual = 'true' THEN '🔴 DANGEROUS: Always allows'
    WHEN qual IS NULL THEN '🔴 DANGEROUS: No condition'
    WHEN qual LIKE '%auth.uid()%' THEN '✅ Safe: Uses auth.uid()'
    WHEN qual LIKE '%tenant_id%' THEN '✅ Safe: Uses tenant check'
    WHEN qual LIKE '%EXISTS%' THEN '⚠️ Uses subquery (potential recursion)'
    ELSE '❓ Custom logic'
  END as "Risk Assessment"
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

