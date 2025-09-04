-- Temporary fix to show appointments regardless of staff mapping issues
-- This will make appointments visible while we investigate the root cause

-- Disable RLS temporarily on appointments table to see all appointments
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'appointments';
