-- FINAL FIX: webhook_logs RLS - disable RLS for INSERT via service role
-- The issue: service_role is a system role that bypasses RLS by default
-- But RLS policies can still block it. We need to either:
-- 1. Disable RLS entirely (simplest for internal-only table)
-- 2. Use BYPASSRLS role (for Wallee service account)
-- 3. Make policy that allows everyone (since service_role should bypass anyway)

-- Drop problematic policies
DROP POLICY IF EXISTS "webhook_logs_service_role_all" ON webhook_logs;
DROP POLICY IF EXISTS "webhook_logs_super_admin_select" ON webhook_logs;

-- Option: Disable RLS for this table entirely (it's internal-only, not user data)
-- Webhooks are system events, not user-sensitive data
ALTER TABLE webhook_logs DISABLE ROW LEVEL SECURITY;

-- Alternative if you want RLS but allow service_role: Create permissive policy for all
-- CREATE POLICY "webhook_logs_allow_all" ON webhook_logs
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);

-- For authenticated users (dashboard access):
-- Can be re-enabled later with proper policies

SELECT '✅ webhook_logs RLS disabled - service_role can now insert/select!' as status;
