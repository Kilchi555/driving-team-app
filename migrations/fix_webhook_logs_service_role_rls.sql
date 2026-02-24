-- Fix webhook_logs RLS policies for service_role access
-- The issue: Policies are for "public" role, but service_role needs to insert webhooks

-- 1. Drop the incorrect policies
DROP POLICY IF EXISTS "Allow service role manage webhook logs" ON webhook_logs;
DROP POLICY IF EXISTS "Allow super_admin read all webhook logs" ON webhook_logs;

-- 2. Create corrected policies

-- For service_role (Wallee webhooks) - allow all operations
CREATE POLICY "webhook_logs_service_role_all" ON webhook_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- For authenticated users - read only if super_admin
CREATE POLICY "webhook_logs_super_admin_select" ON webhook_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

-- For public/anon - no access
-- (implicit deny - no policy needed)

SELECT '✅ webhook_logs RLS policies fixed for service_role!' as status;
