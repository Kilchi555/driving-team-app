-- Temporary fix for staff mapping issue
-- This will allow appointments to be displayed while we fix the staff mapping

-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Allow all authenticated users to view appointments" ON appointments;

-- Create a very permissive SELECT policy that bypasses staff mapping issues
CREATE POLICY "Allow all authenticated users to view all appointments" ON appointments
  FOR SELECT USING (auth.role() = 'authenticated');

-- Keep the other policies as they are for now
-- (INSERT, UPDATE, DELETE policies remain unchanged)

-- Verify the policy was updated
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'appointments' AND cmd = 'SELECT';
