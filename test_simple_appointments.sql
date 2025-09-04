-- Simple test to see if we can access appointments at all
-- This will help identify the root cause

-- Test 1: Can we see any appointments?
SELECT COUNT(*) as total_appointments FROM appointments;

-- Test 2: Can we see appointments for a specific staff member?
-- (Replace with actual staff ID)
SELECT 
  id, 
  title, 
  start_time, 
  end_time, 
  staff_id, 
  user_id, 
  status 
FROM appointments 
WHERE staff_id IS NOT NULL 
LIMIT 5;

-- Test 3: Can we see past appointments?
SELECT 
  id, 
  title, 
  start_time, 
  end_time, 
  status 
FROM appointments 
WHERE end_time < NOW()
  AND status IN ('completed', 'confirmed', 'scheduled')
  AND deleted_at IS NULL
LIMIT 5;

-- Test 4: Check if RLS is blocking us
-- This will show if RLS is enabled on appointments
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'appointments';

-- Test 5: Show all RLS policies on appointments
SELECT 
  policyname, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'appointments';
