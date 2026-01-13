-- Fix RLS policies to show errors even without tenant_id
-- This is important because Sentry logged errors may not have tenant_id set

-- Drop old policies
DROP POLICY IF EXISTS "Admins and super_admin can view errors" ON error_logs;
DROP POLICY IF EXISTS "Authenticated users can insert errors" ON error_logs;
DROP POLICY IF EXISTS "Service role can manage all errors" ON error_logs;

-- Create new policies that handle null tenant_id

-- Super admin: View ALL errors (including those without tenant_id)
CREATE POLICY "Super admin can view all errors" ON error_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

-- Regular admins: View errors for their tenant PLUS errors without tenant_id
CREATE POLICY "Admins can view tenant errors" ON error_logs
  FOR SELECT TO authenticated
  USING (
    -- Regular admins can view errors for their tenant
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
      AND u.tenant_id = error_logs.tenant_id
      AND u.role IN ('admin', 'tenant_admin')
    )
    OR
    -- All admins can view tenant-less errors (e.g., from Sentry)
    (
      error_logs.tenant_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('admin', 'tenant_admin', 'super_admin')
      )
    )
  );

-- Allow authenticated users to insert errors
CREATE POLICY "Authenticated users can insert errors" ON error_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Service role bypass
CREATE POLICY "Service role can manage all errors" ON error_logs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

