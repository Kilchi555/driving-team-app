-- Fix RLS policy to not check current user, only tenant access
-- This allows any authenticated user to access external busy times for any tenant

-- Drop existing policy
DROP POLICY IF EXISTS external_busy_times_tenant_isolation ON external_busy_times;

-- Create new policy that allows access to all external busy times for authenticated users
-- This is for the availability system which should work across tenants
CREATE POLICY external_busy_times_availability_access ON external_busy_times
  FOR SELECT TO authenticated
  USING (true);

-- Keep the existing policy for other operations (INSERT, UPDATE, DELETE)
CREATE POLICY external_busy_times_tenant_isolation_other ON external_busy_times
  FOR ALL TO authenticated
  USING (
    tenant_id = (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );
