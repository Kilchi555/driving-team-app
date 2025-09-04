-- Fix RLS policies for notes table to allow evaluation saving
-- This fixes the 403 Forbidden error when saving evaluation criteria

-- Enable RLS on notes table if not already enabled
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all authenticated access to notes" ON notes;
DROP POLICY IF EXISTS "Staff can view notes for their appointments" ON notes;
DROP POLICY IF EXISTS "Staff can create notes for their appointments" ON notes;
DROP POLICY IF EXISTS "Staff can update notes for their appointments" ON notes;
DROP POLICY IF EXISTS "Admins can manage all notes" ON notes;

-- Create comprehensive policies for notes table

-- Policy 1: Allow all authenticated users to view notes
CREATE POLICY "Allow all authenticated access to notes" ON notes
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy 2: Allow staff to create notes for appointments they're assigned to
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

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'notes' 
ORDER BY policyname;
