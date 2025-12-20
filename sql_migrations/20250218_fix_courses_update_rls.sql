-- Migration: Fix courses table UPDATE RLS policy
-- Problem: The UPDATE policy for courses was missing the WITH CHECK clause
-- This caused silent failures when trying to update course status
-- Date: 2025-02-18

-- Drop the old policy that's missing WITH CHECK
DROP POLICY IF EXISTS "courses_tenant_update" ON public.courses;

-- Create a new policy with both USING and WITH CHECK
CREATE POLICY "courses_tenant_update" ON public.courses
  FOR UPDATE TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND is_active = true
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND is_active = true
  ));

-- Verify the policy was created
SELECT 
    policyname,
    permissive,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'courses' AND policyname = 'courses_tenant_update';

