-- Allow tenant staff/admins to manage their event_types (INSERT/UPDATE/DELETE).
-- Previously only SELECT was allowed ("event_types_read"), so Admin UI toggles
-- (Öffentlich/Intern, etc.) updated optimistically but never persisted.
-- Also allow anon to read active public_bookable types for the booking flow.

ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_types_staff_manage" ON event_types;
DROP POLICY IF EXISTS "event_types_anon_read_public" ON event_types;

-- Staff/admin can manage rows belonging to their tenant (not global templates)
CREATE POLICY "event_types_staff_manage" ON event_types
  FOR ALL
  TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.is_active = true
        AND u.tenant_id = event_types.tenant_id
        AND u.role IN ('admin', 'tenant_admin', 'staff')
    )
  )
  WITH CHECK (
    tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.is_active = true
        AND u.tenant_id = event_types.tenant_id
        AND u.role IN ('admin', 'tenant_admin', 'staff')
    )
  );

-- Public booking (anon key in get-availability): only online-bookable types
CREATE POLICY "event_types_anon_read_public" ON event_types
  FOR SELECT
  TO anon
  USING (
    tenant_id IS NOT NULL
    AND is_active = true
    AND public_bookable = true
  );
