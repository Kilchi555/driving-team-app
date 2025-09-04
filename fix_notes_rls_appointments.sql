-- Fix RLS policies for notes table to allow appointments JOIN queries
-- This fixes the issue where appointments are not displayed due to notes RLS blocking the JOIN

-- Drop the problematic policies that might interfere with JOINs
DROP POLICY IF EXISTS "Staff can manage notes for own appointments" ON notes;
DROP POLICY IF EXISTS "Users can view notes for own appointments" ON notes;

-- Keep the essential policies but make them more permissive for JOINs
-- Policy 1: Allow all authenticated users to view notes (for JOINs)
DROP POLICY IF EXISTS "Allow all authenticated access to notes" ON notes;
CREATE POLICY "Allow all authenticated access to notes" ON notes
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy 2: Allow staff to create notes for appointments they're assigned to
DROP POLICY IF EXISTS "Staff can create notes for their appointments" ON notes;
CREATE POLICY "Staff can create notes for their appointments" ON notes
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND (
      -- Staff can create notes for appointments they're assigned to
      EXISTS (
        SELECT 1 FROM appointments 
        WHERE appointments.id = notes.appointment_id 
        AND appointments.staff_id = auth.uid()
      ) OR
      -- Admins can create notes for any appointment
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
      )
    )
  );

-- Policy 3: Allow staff to update notes for appointments they're assigned to
DROP POLICY IF EXISTS "Staff can update notes for their appointments" ON notes;
CREATE POLICY "Staff can update notes for their appointments" ON notes
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND (
      -- Staff can update notes for appointments they're assigned to
      EXISTS (
        SELECT 1 FROM appointments 
        WHERE appointments.id = notes.appointment_id 
        AND appointments.staff_id = auth.uid()
      ) OR
      -- Admins can update any notes
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
      )
    )
  );

-- Policy 4: Allow staff to delete notes for appointments they're assigned to
DROP POLICY IF EXISTS "Staff can delete notes for their appointments" ON notes;
CREATE POLICY "Staff can delete notes for their appointments" ON notes
  FOR DELETE USING (
    auth.role() = 'authenticated' AND (
      -- Staff can delete notes for appointments they're assigned to
      EXISTS (
        SELECT 1 FROM appointments 
        WHERE appointments.id = notes.appointment_id 
        AND appointments.staff_id = auth.uid()
      ) OR
      -- Admins can delete any notes
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
      )
    )
  );

-- Verify the policies were updated
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'notes' 
ORDER BY policyname;
