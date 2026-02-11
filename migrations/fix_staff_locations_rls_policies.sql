-- Fix staff_locations RLS policies
-- The issue: policies were comparing auth.uid() directly to staff_id
-- but auth.uid() returns the Supabase Auth ID, not the User Profile ID
-- We need to join with users table to get the correct user_id

-- Fix: Staff can view their own locations
DROP POLICY IF EXISTS "Staff can view their own locations" ON staff_locations;

CREATE POLICY "Staff can view their own locations" ON staff_locations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = staff_locations.staff_id
      AND u.auth_user_id = auth.uid()
    )
  );

-- Fix: Staff can manage their own locations
DROP POLICY IF EXISTS "Staff can manage their own locations" ON staff_locations;

CREATE POLICY "Staff can manage their own locations" ON staff_locations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = staff_locations.staff_id
      AND u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = staff_locations.staff_id
      AND u.auth_user_id = auth.uid()
    )
  );
