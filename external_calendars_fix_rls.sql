-- Fix RLS policies for external calendars and busy times
-- The issue: policies compare auth.uid() with users.id instead of users.auth_user_id

-- Drop existing policies
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'external_calendars_tenant_isolation') THEN
    DROP POLICY external_calendars_tenant_isolation ON external_calendars;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'external_busy_times_tenant_isolation') THEN
    DROP POLICY external_busy_times_tenant_isolation ON external_busy_times;
  END IF;
END $$;

-- Recreate policies using correct auth.uid() to users.auth_user_id mapping
CREATE POLICY external_calendars_tenant_isolation ON external_calendars
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

CREATE POLICY external_busy_times_tenant_isolation ON external_busy_times
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
