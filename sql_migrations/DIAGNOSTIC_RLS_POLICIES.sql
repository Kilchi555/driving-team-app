-- RLS Policy Diagnostic Script
-- Use this to debug and fix RLS issues with course status changes

-- Step 1: Check all policies on courses table
SELECT
    policyname,
    permissive,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'courses'
ORDER BY cmd, policyname;

-- Step 2: Check if UPDATE policy exists and has WITH CHECK
SELECT
    policyname,
    cmd,
    with_check IS NOT NULL as has_with_check
FROM pg_policies
WHERE tablename = 'courses' AND cmd = 'UPDATE';

-- Step 3: Verify the specific tenant_update policy
SELECT
    policyname,
    permissive,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'courses' AND policyname = 'courses_tenant_update';

-- Step 4: If the policy is missing or broken, create it
-- First, drop the old one if it exists
DROP POLICY IF EXISTS "courses_tenant_update" ON public.courses;

-- Create the correct policy with both USING and WITH CHECK
CREATE POLICY "courses_tenant_update" ON public.courses
  FOR UPDATE TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND is_active = true
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND is_active = true
  ));

-- Step 5: Verify the policy was created correctly
SELECT
    policyname,
    permissive,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'courses' AND policyname = 'courses_tenant_update';

-- Step 6: Test if you can read courses (requires authenticated user)
-- This should return courses for your tenant
SELECT id, name, status, tenant_id
FROM public.courses
WHERE tenant_id IN (
  SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND is_active = true
)
LIMIT 5;

-- Step 7: Verify that RLS is enabled on courses table
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'courses';

-- Step 8: If RLS is not enabled, enable it
-- ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Step 9: Check all RLS policies status
SELECT
    schemaname,
    tablename,
    rowsecurity,
    (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as policy_count
FROM pg_tables
WHERE tablename IN ('courses', 'course_sessions', 'course_registrations', 'users')
ORDER BY tablename;

-- Step 10: Full policy report
SELECT
    tablename,
    policyname,
    permissive,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN 'USING ✓'
        ELSE 'USING ✗'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'WITH CHECK ✓'
        ELSE 'WITH CHECK ✗'
    END as with_check_clause
FROM pg_policies
WHERE tablename IN ('courses', 'course_sessions', 'course_registrations', 'users')
ORDER BY tablename, cmd, policyname;

