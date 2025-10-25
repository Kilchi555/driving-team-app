-- Fix RLS Policies for staff_working_hours table
-- Problem: RLS Policy compares auth.uid() with staff_id, but should compare with auth_user_id
-- This fixes the issue where saved working hours are not displayed in staff settings

-- 1. Drop existing incorrect policies
DROP POLICY IF EXISTS "Staff can manage their own working hours" ON staff_working_hours;
DROP POLICY IF EXISTS "Admins can view all working hours" ON staff_working_hours;

-- 2. Create corrected RLS Policies
-- Policy: Staff können ihre eigenen Arbeitszeiten verwalten
-- Vergleicht auth.uid() mit der auth_user_id in der users Tabelle
CREATE POLICY "Staff can manage their own working hours" ON staff_working_hours
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = staff_working_hours.staff_id 
      AND users.auth_user_id = auth.uid()
    )
  );

-- Policy: Admins können alle Arbeitszeiten sehen
CREATE POLICY "Admins can view all working hours" ON staff_working_hours
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_user_id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 3. Verify the policies were created correctly
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'staff_working_hours'
ORDER BY policyname;

-- 4. Test query to verify the policy works
-- This query should return working hours for the current authenticated user
SELECT 
  swh.*,
  u.first_name,
  u.last_name,
  u.auth_user_id,
  auth.uid() as current_auth_uid
FROM staff_working_hours swh
JOIN users u ON u.id = swh.staff_id
WHERE u.auth_user_id = auth.uid();

