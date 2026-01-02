-- Fix error_logs RLS to allow super_admin to see all errors
-- This migration updates the existing policy to include super_admin role

-- Drop the old policy that doesn't include super_admin
DROP POLICY IF EXISTS "Admins can view tenant errors" ON error_logs;

-- Create new policy that includes super_admin
CREATE POLICY "Admins and super_admin can view errors" ON error_logs
  FOR SELECT TO authenticated
  USING (
    -- Super admin can view ALL errors (no tenant filter)
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
    )
    OR
    -- Regular admins can view errors for their tenant
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
      AND u.tenant_id = error_logs.tenant_id
      AND u.role IN ('admin', 'tenant_admin')
    )
  );

