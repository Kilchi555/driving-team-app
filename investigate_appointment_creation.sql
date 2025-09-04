-- Investigate why appointments have admin ID as staff_id
-- This will help identify the root cause of the appointment creation issue

-- Check who created the appointments
SELECT 
  a.id as appointment_id,
  a.title,
  a.staff_id,
  a.user_id,
  a.created_at,
  staff_user.first_name as staff_first_name,
  staff_user.last_name as staff_last_name,
  staff_user.role as staff_role,
  student_user.first_name as student_first_name,
  student_user.last_name as student_last_name,
  student_user.role as student_role
FROM appointments a
LEFT JOIN users staff_user ON staff_user.id = a.staff_id
LEFT JOIN users student_user ON student_user.id = a.user_id
WHERE a.staff_id IS NOT NULL
ORDER BY a.created_at DESC
LIMIT 10;

-- Check if there are any appointments created by actual staff (not admin)
SELECT 
  COUNT(*) as total_appointments,
  COUNT(CASE WHEN u.role = 'admin' THEN 1 END) as admin_appointments,
  COUNT(CASE WHEN u.role = 'staff' THEN 1 END) as staff_appointments,
  COUNT(CASE WHEN u.role = 'client' THEN 1 END) as client_appointments
FROM appointments a
LEFT JOIN users u ON u.id = a.staff_id;

-- Check the most recent appointments and their creation details
SELECT 
  a.id,
  a.title,
  a.staff_id,
  a.user_id,
  a.created_at,
  a.status,
  a.event_type_code,
  staff_user.first_name as staff_name,
  staff_user.role as staff_role
FROM appointments a
LEFT JOIN users staff_user ON staff_user.id = a.staff_id
WHERE a.created_at >= NOW() - INTERVAL '7 days'
ORDER BY a.created_at DESC;

-- Check if there are any staff users who should be creating appointments
SELECT 
  id,
  auth_user_id,
  first_name,
  last_name,
  role,
  created_at
FROM users 
WHERE role = 'staff'
ORDER BY created_at DESC;
