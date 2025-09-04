-- Fix RLS policies for appointments table with correct user ID mappings
-- This fixes the issue where appointments are not displayed due to incorrect user ID references

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Admins can manage all appointments" ON appointments;
DROP POLICY IF EXISTS "Staff can create appointments" ON appointments;
DROP POLICY IF EXISTS "Staff can delete own appointments" ON appointments;
DROP POLICY IF EXISTS "Staff can update own appointments" ON appointments;
DROP POLICY IF EXISTS "Staff can view student last appointments" ON appointments;
DROP POLICY IF EXISTS "Users can manage their own appointments" ON appointments;

-- Create corrected policies with proper user ID mappings

-- Policy 1: Allow all authenticated users to view appointments (for JOINs and general access)
CREATE POLICY "Allow all authenticated access to appointments" ON appointments
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy 2: Allow staff to create appointments (using correct user ID mapping)
CREATE POLICY "Staff can create appointments" ON appointments
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND (
      -- Staff can create appointments for their students
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.auth_user_id = auth.uid()
        AND users.id = appointments.staff_id
        AND users.role IN ('staff', 'admin')
      ) OR
      -- Admins can create any appointments
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.auth_user_id = auth.uid()
        AND users.role = 'admin'
      )
    )
  );

-- Policy 3: Allow staff to update their appointments (using correct user ID mapping)
CREATE POLICY "Staff can update their appointments" ON appointments
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND (
      -- Staff can update appointments they're assigned to
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.auth_user_id = auth.uid()
        AND users.id = appointments.staff_id
        AND users.role IN ('staff', 'admin')
      ) OR
      -- Admins can update any appointments
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.auth_user_id = auth.uid()
        AND users.role = 'admin'
      )
    )
  );

-- Policy 4: Allow staff to delete their appointments (using correct user ID mapping)
CREATE POLICY "Staff can delete their appointments" ON appointments
  FOR DELETE USING (
    auth.role() = 'authenticated' AND (
      -- Staff can delete appointments they're assigned to
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.auth_user_id = auth.uid()
        AND users.id = appointments.staff_id
        AND users.role IN ('staff', 'admin')
      ) OR
      -- Admins can delete any appointments
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.auth_user_id = auth.uid()
        AND users.role = 'admin'
      )
    )
  );

-- Verify the corrected policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'appointments' 
ORDER BY policyname;
