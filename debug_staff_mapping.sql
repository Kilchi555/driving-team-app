-- Debug staff ID mapping issue
-- This will help identify why staff_id doesn't match auth.uid()

-- Check what user is currently authenticated
SELECT auth.uid() as current_auth_uid;

-- Check all staff users and their mappings
SELECT 
  id as db_user_id,
  auth_user_id,
  first_name,
  last_name,
  role,
  CASE 
    WHEN auth_user_id = auth.uid() THEN 'CURRENT USER'
    ELSE 'OTHER USER'
  END as is_current_user
FROM users 
WHERE role IN ('staff', 'admin')
ORDER BY is_current_user DESC, first_name;

-- Check appointments and their staff assignments
SELECT 
  a.id as appointment_id,
  a.title,
  a.staff_id as appointment_staff_id,
  u.first_name as staff_first_name,
  u.last_name as staff_last_name,
  u.auth_user_id as staff_auth_id,
  CASE 
    WHEN u.auth_user_id = auth.uid() THEN 'MATCHES CURRENT USER'
    ELSE 'DIFFERENT USER'
  END as staff_match
FROM appointments a
LEFT JOIN users u ON u.id = a.staff_id
WHERE a.staff_id IS NOT NULL
ORDER BY a.start_time DESC
LIMIT 10;

-- Check if there are any appointments for the current user
SELECT 
  COUNT(*) as total_appointments,
  COUNT(CASE WHEN u.auth_user_id = auth.uid() THEN 1 END) as appointments_for_current_user
FROM appointments a
LEFT JOIN users u ON u.id = a.staff_id;
