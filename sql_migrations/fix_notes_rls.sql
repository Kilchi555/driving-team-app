-- Fix RLS policies for 'notes' table
-- Issue: Staff cannot insert/update/delete notes with 403 Forbidden error

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "notes_select_policy" ON notes;
DROP POLICY IF EXISTS "notes_insert_policy" ON notes;
DROP POLICY IF EXISTS "notes_update_policy" ON notes;
DROP POLICY IF EXISTS "notes_delete_policy" ON notes;

-- Enable RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- SELECT: Staff can see notes for appointments they are assigned to
-- Admins/Staff can see all notes for their tenant
CREATE POLICY "notes_select_policy" ON notes
FOR SELECT
USING (
  -- Check if user is staff/admin for the tenant
  EXISTS (
    SELECT 1 FROM appointments a
    JOIN users u ON a.staff_id = u.id
    WHERE a.id = appointment_id
    AND u.tenant_id = (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  )
  OR
  -- Or if user is admin/staff with same tenant
  (
    SELECT role FROM users 
    WHERE auth_user_id = auth.uid()
  ) IN ('admin', 'staff')
);

-- INSERT: Staff can create notes for appointments in their tenant
CREATE POLICY "notes_insert_policy" ON notes
FOR INSERT
WITH CHECK (
  -- Check if appointment belongs to their tenant
  EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.id = appointment_id
    AND a.tenant_id = (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  )
  AND
  -- Only staff/admin can create notes
  (
    SELECT role FROM users 
    WHERE auth_user_id = auth.uid()
  ) IN ('admin', 'staff')
);

-- UPDATE: Staff can update notes for appointments in their tenant
CREATE POLICY "notes_update_policy" ON notes
FOR UPDATE
USING (
  -- Check if appointment belongs to their tenant
  EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.id = appointment_id
    AND a.tenant_id = (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  )
  AND
  -- Only staff/admin can update notes
  (
    SELECT role FROM users 
    WHERE auth_user_id = auth.uid()
  ) IN ('admin', 'staff')
)
WITH CHECK (
  -- Same checks for the new data
  EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.id = appointment_id
    AND a.tenant_id = (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  )
  AND
  (
    SELECT role FROM users 
    WHERE auth_user_id = auth.uid()
  ) IN ('admin', 'staff')
);

-- DELETE: Staff can delete notes for appointments in their tenant
CREATE POLICY "notes_delete_policy" ON notes
FOR DELETE
USING (
  -- Check if appointment belongs to their tenant
  EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.id = appointment_id
    AND a.tenant_id = (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  )
  AND
  -- Only staff/admin can delete notes
  (
    SELECT role FROM users 
    WHERE auth_user_id = auth.uid()
  ) IN ('admin', 'staff')
);

