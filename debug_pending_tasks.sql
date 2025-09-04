-- Debug script to test the exact query from usePendingTasks
-- This will help identify which part of the query is failing

-- First, let's check what user we're working with
SELECT 
  id, 
  auth_user_id, 
  first_name, 
  last_name, 
  role 
FROM users 
WHERE role IN ('staff', 'admin') 
LIMIT 5;

-- Test the exact query from usePendingTasks for a specific staff user
-- Replace 'STAFF_USER_ID_HERE' with an actual staff user ID from the query above
WITH staff_user AS (
  SELECT id FROM users WHERE role = 'staff' LIMIT 1
)
SELECT 
  a.id,
  a.title,
  a.start_time,
  a.end_time,
  a.user_id,
  a.status,
  a.event_type_code,
  a.type,
  u.first_name,
  u.last_name,
  u.category
FROM appointments a
LEFT JOIN users u ON u.id = a.user_id
CROSS JOIN staff_user su
WHERE a.staff_id = su.id
  AND a.end_time < NOW()
  AND a.status IN ('completed', 'confirmed', 'scheduled')
  AND a.deleted_at IS NULL
ORDER BY a.start_time
LIMIT 10;

-- Test if we can access notes
SELECT COUNT(*) as notes_count FROM notes;

-- Test if we can access payments  
SELECT COUNT(*) as payments_count FROM payments;

-- Test if we can access exam_results
SELECT COUNT(*) as exam_results_count FROM exam_results;
