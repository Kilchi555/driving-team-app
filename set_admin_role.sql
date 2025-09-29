-- Set user role to admin
-- Replace 'deine-email@domain.com' with your actual email

UPDATE users 
SET role = 'admin' 
WHERE email = 'kilchi@drivingteam.ch';

-- Verify the change
SELECT id, email, role, first_name, last_name 
FROM users 
WHERE email = 'kilchi@drivingteam.ch';





