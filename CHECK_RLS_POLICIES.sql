-- =====================================================
-- CHECK RLS POLICIES: users, appointments, payments
-- =====================================================

-- TABLE 1: users
SELECT 
  'USERS' as table_name,
  policyname,
  cmd,
  roles::text,
  CASE 
    WHEN qual IS NULL THEN 'NO CONDITION (DANGER!)'
    WHEN qual = 'true' THEN 'ALWAYS TRUE (DANGER!)'
    WHEN qual LIKE '%auth.uid()%' THEN '✅ Uses auth.uid()'
    WHEN qual LIKE '%= auth.uid()%' THEN '✅ Safe: Self-read'
    WHEN qual LIKE '%auth_user_id = auth.uid()%' THEN '✅ Safe: Auth ID check'
    WHEN qual LIKE '%tenant_id%' THEN '✅ Tenant-scoped'
    ELSE '❓ Custom: ' || SUBSTR(qual, 1, 50)
  END as assessment
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- TABLE 2: appointments
SELECT 
  'APPOINTMENTS' as table_name,
  policyname,
  cmd,
  roles::text,
  CASE 
    WHEN qual IS NULL THEN 'NO CONDITION (DANGER!)'
    WHEN qual = 'true' THEN 'ALWAYS TRUE (DANGER!)'
    WHEN qual LIKE '%auth.uid()%' THEN '✅ Uses auth.uid()'
    WHEN qual LIKE '%user_id = auth.uid()%' THEN '✅ Safe: Self-read'
    WHEN qual LIKE '%tenant_id%' THEN '✅ Tenant-scoped'
    ELSE '❓ Custom: ' || SUBSTR(qual, 1, 50)
  END as assessment
FROM pg_policies
WHERE tablename = 'appointments'
ORDER BY policyname;

-- TABLE 3: payments
SELECT 
  'PAYMENTS' as table_name,
  policyname,
  cmd,
  roles::text,
  CASE 
    WHEN qual IS NULL THEN 'NO CONDITION (DANGER!)'
    WHEN qual = 'true' THEN 'ALWAYS TRUE (DANGER!)'
    WHEN qual LIKE '%auth.uid()%' THEN '✅ Uses auth.uid()'
    WHEN qual LIKE '%user_id = auth.uid()%' THEN '✅ Safe: Self-read'
    WHEN qual LIKE '%tenant_id%' THEN '✅ Tenant-scoped'
    ELSE '❓ Custom: ' || SUBSTR(qual, 1, 50)
  END as assessment
FROM pg_policies
WHERE tablename = 'payments'
ORDER BY policyname;

-- SUMMARY
SELECT 
  tablename,
  COUNT(*) as total_policies,
  COUNT(CASE WHEN 'anon'::regrole = ANY(roles) THEN 1 END) as anon_policies,
  COUNT(CASE WHEN 'service_role'::regrole = ANY(roles) THEN 1 END) as service_role_policies,
  COUNT(CASE WHEN 'authenticated'::regrole = ANY(roles) THEN 1 END) as authenticated_policies
FROM pg_policies
WHERE tablename IN ('users', 'appointments', 'payments')
GROUP BY tablename
ORDER BY tablename;
