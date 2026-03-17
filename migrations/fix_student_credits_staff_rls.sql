-- Migration: Add RLS policies for student_credits to allow staff operations
-- Staff/admin/instructor can read and update student_credits within their tenant

-- Enable RLS if not already enabled
ALTER TABLE student_credits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "student_credits_select_own" ON student_credits;
DROP POLICY IF EXISTS "student_credits_select_staff" ON student_credits;
DROP POLICY IF EXISTS "student_credits_insert_own" ON student_credits;
DROP POLICY IF EXISTS "student_credits_insert_staff" ON student_credits;
DROP POLICY IF EXISTS "student_credits_update_own" ON student_credits;
DROP POLICY IF EXISTS "student_credits_update_staff" ON student_credits;

-- Customers can read their own credit
CREATE POLICY "student_credits_select_own"
ON student_credits FOR SELECT
TO authenticated
USING (
  user_id = (
    SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1
  )
);

-- Staff/admin/instructor can read credits of users in their tenant
CREATE POLICY "student_credits_select_staff"
ON student_credits FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_user_id = auth.uid()
      AND u.tenant_id = student_credits.tenant_id
      AND u.role IN ('staff', 'admin', 'super_admin', 'tenant_admin', 'instructor')
  )
);

-- Customers can insert/upsert their own credit (for topup flows)
CREATE POLICY "student_credits_insert_own"
ON student_credits FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (
    SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1
  )
);

-- Staff/admin/instructor can insert credits for users in their tenant
CREATE POLICY "student_credits_insert_staff"
ON student_credits FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_user_id = auth.uid()
      AND u.tenant_id = student_credits.tenant_id
      AND u.role IN ('staff', 'admin', 'super_admin', 'tenant_admin', 'instructor')
  )
);

-- Customers can update their own credit
CREATE POLICY "student_credits_update_own"
ON student_credits FOR UPDATE
TO authenticated
USING (
  user_id = (
    SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1
  )
);

-- Staff/admin/instructor can update credits of users in their tenant
CREATE POLICY "student_credits_update_staff"
ON student_credits FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_user_id = auth.uid()
      AND u.tenant_id = student_credits.tenant_id
      AND u.role IN ('staff', 'admin', 'super_admin', 'tenant_admin', 'instructor')
  )
);
