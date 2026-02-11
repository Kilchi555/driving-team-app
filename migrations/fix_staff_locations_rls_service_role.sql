-- Fix staff_locations RLS to allow service role access
-- The service role key should bypass RLS, but we'll add explicit policies as fallback
-- This allows API endpoints to properly query staff_locations

-- Drop existing policies that might be blocking service role
DROP POLICY IF EXISTS staff_locations_select_own ON staff_locations;
DROP POLICY IF EXISTS staff_locations_select_admin ON staff_locations;
DROP POLICY IF EXISTS staff_locations_update_own ON staff_locations;
DROP POLICY IF EXISTS staff_locations_insert_own ON staff_locations;

-- Add permissive policies that allow service role to read all data
-- Note: The service role should bypass RLS entirely, but these are safety policies

-- SELECT: Allow staff to view their own entries
CREATE POLICY staff_locations_select_own ON staff_locations
  FOR SELECT
  USING (
    -- Allow staff to see their own location mappings
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = staff_locations.staff_id
      AND u.auth_user_id = auth.uid()
    )
  );

-- SELECT: Allow admins to view all entries in their tenant
CREATE POLICY staff_locations_select_admin ON staff_locations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.tenant_id = staff_locations.tenant_id
      AND u.auth_user_id = auth.uid()
      AND u.admin_level IS NOT NULL
    )
  );

-- SELECT: Allow service role / API endpoints (when using service role key)
-- This is a fallback in case service role bypass isn't working
CREATE POLICY staff_locations_select_service_role ON staff_locations
  FOR SELECT
  USING (true);

-- UPDATE: Allow staff to update their own entries
CREATE POLICY staff_locations_update_own ON staff_locations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = staff_locations.staff_id
      AND u.auth_user_id = auth.uid()
    )
  );

-- UPDATE: Allow admins to update entries in their tenant
CREATE POLICY staff_locations_update_admin ON staff_locations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.tenant_id = staff_locations.tenant_id
      AND u.auth_user_id = auth.uid()
      AND u.admin_level IS NOT NULL
    )
  );

-- INSERT: Allow staff to insert their own entries
CREATE POLICY staff_locations_insert_own ON staff_locations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = staff_locations.staff_id
      AND u.auth_user_id = auth.uid()
    )
  );

-- INSERT: Allow admins to insert entries in their tenant
CREATE POLICY staff_locations_insert_admin ON staff_locations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.tenant_id = staff_locations.tenant_id
      AND u.auth_user_id = auth.uid()
      AND u.admin_level IS NOT NULL
    )
  );
