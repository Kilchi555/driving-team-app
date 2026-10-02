-- Replace staff_locations admin policies that authorized via admin_level.
-- Admin access requires role = admin, active, not deleted,
-- and the same tenant.
-- Staff-own policies and the service-role policy are not changed.
-- Historical migrations are not modified.
-- Do not apply to production until this change is reviewed.

BEGIN;

DROP POLICY IF EXISTS staff_locations_select_admin ON staff_locations;
CREATE POLICY staff_locations_select_admin ON staff_locations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.tenant_id = staff_locations.tenant_id
        AND u.auth_user_id = auth.uid()
        AND u.role = 'admin'
        AND u.is_active = true
        AND u.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS staff_locations_update_admin ON staff_locations;
CREATE POLICY staff_locations_update_admin ON staff_locations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.tenant_id = staff_locations.tenant_id
        AND u.auth_user_id = auth.uid()
        AND u.role = 'admin'
        AND u.is_active = true
        AND u.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS staff_locations_insert_admin ON staff_locations;
CREATE POLICY staff_locations_insert_admin ON staff_locations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.tenant_id = staff_locations.tenant_id
        AND u.auth_user_id = auth.uid()
        AND u.role = 'admin'
        AND u.is_active = true
        AND u.deleted_at IS NULL
    )
  );

COMMIT;
