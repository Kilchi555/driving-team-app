-- Clean up all RLS policies for appointments table and create simple, working policies
-- This will fix the issue where appointments are not displayed

-- Drop ALL existing policies to start completely fresh
DROP POLICY IF EXISTS "Admins can manage all appointments" ON appointments;
DROP POLICY IF EXISTS "Allow all authenticated access to appointments" ON appointments;
DROP POLICY IF EXISTS "Staff can create appointments" ON appointments;
DROP POLICY IF EXISTS "Staff can delete own appointments" ON appointments;
DROP POLICY IF EXISTS "Staff can delete their appointments" ON appointments;
DROP POLICY IF EXISTS "Staff can update own appointments" ON appointments;
DROP POLICY IF EXISTS "Staff can update their appointments" ON appointments;
DROP POLICY IF EXISTS "Staff can view student last appointments" ON appointments;
DROP POLICY IF EXISTS "Users can manage their own appointments" ON appointments;

-- Create simple, working policies

-- Policy 1: Allow all authenticated users to view appointments (this should fix the display issue)
CREATE POLICY "Allow all authenticated users to view appointments" ON appointments
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy 2: Allow staff to create appointments
CREATE POLICY "Allow staff to create appointments" ON appointments
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND (
      -- Staff can create appointments
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.auth_user_id = auth.uid()
        AND users.role IN ('staff', 'admin')
      )
    )
  );

-- Policy 3: Allow staff to update appointments
CREATE POLICY "Allow staff to update appointments" ON appointments
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND (
      -- Staff can update appointments
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.auth_user_id = auth.uid()
        AND users.role IN ('staff', 'admin')
      )
    )
  );

-- Policy 4: Allow staff to delete appointments
CREATE POLICY "Allow staff to delete appointments" ON appointments
  FOR DELETE USING (
    auth.role() = 'authenticated' AND (
      -- Staff can delete appointments
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.auth_user_id = auth.uid()
        AND users.role IN ('staff', 'admin')
      )
    )
  );

-- Verify the clean policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'appointments' 
ORDER BY policyname;
