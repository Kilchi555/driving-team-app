-- Fix RLS policies for appointments table to allow pending tasks loading
-- This should resolve the issue where no appointments are displayed

-- First, let's see what RLS policies exist on appointments
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'appointments' 
ORDER BY policyname;

-- Enable RLS on appointments if not already enabled
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own appointments" ON appointments;
DROP POLICY IF EXISTS "Staff can view their students appointments" ON appointments;
DROP POLICY IF EXISTS "Admins can view all appointments" ON appointments;
DROP POLICY IF EXISTS "Staff can create appointments" ON appointments;
DROP POLICY IF EXISTS "Staff can update their appointments" ON appointments;
DROP POLICY IF EXISTS "Staff can delete their appointments" ON appointments;
DROP POLICY IF EXISTS "Allow all authenticated access to appointments" ON appointments;

-- Create comprehensive policies for appointments table

-- Policy 1: Allow all authenticated users to view appointments (for JOINs and general access)
CREATE POLICY "Allow all authenticated access to appointments" ON appointments
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy 2: Allow staff to create appointments
CREATE POLICY "Staff can create appointments" ON appointments
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND (
      -- Staff can create appointments for their students
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = appointments.staff_id 
        AND users.auth_user_id = auth.uid()
        AND users.role IN ('staff', 'admin')
      ) OR
      -- Admins can create any appointments
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
      )
    )
  );

-- Policy 3: Allow staff to update their appointments
CREATE POLICY "Staff can update their appointments" ON appointments
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND (
      -- Staff can update appointments they're assigned to
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = appointments.staff_id 
        AND users.auth_user_id = auth.uid()
        AND users.role IN ('staff', 'admin')
      ) OR
      -- Admins can update any appointments
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
      )
    )
  );

-- Policy 4: Allow staff to delete their appointments
CREATE POLICY "Staff can delete their appointments" ON appointments
  FOR DELETE USING (
    auth.role() = 'authenticated' AND (
      -- Staff can delete appointments they're assigned to
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = appointments.staff_id 
        AND users.auth_user_id = auth.uid()
        AND users.role IN ('staff', 'admin')
      ) OR
      -- Admins can delete any appointments
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
WHERE tablename = 'appointments' 
ORDER BY policyname;
