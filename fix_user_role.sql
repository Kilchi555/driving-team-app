-- Fix user role: Pascal Kilchenmann should be admin, not staff
-- This will resolve the appointment creation and RLS issues

-- Update Pascal's role from 'staff' to 'admin'
UPDATE users 
SET role = 'admin' 
WHERE id = '091afa9b-e8a1-43b8-9cae-3195621619ae' 
  AND first_name = 'Pascal' 
  AND last_name = 'Kilchenmann';

-- Verify the change
SELECT 
  id,
  auth_user_id,
  first_name,
  last_name,
  role,
  created_at
FROM users 
WHERE id = '091afa9b-e8a1-43b8-9cae-3195621619ae';

-- Check if there are any other users with incorrect roles
SELECT 
  id,
  first_name,
  last_name,
  role,
  created_at
FROM users 
WHERE role = 'staff' 
ORDER BY created_at DESC;