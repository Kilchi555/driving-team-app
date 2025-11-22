-- Fix email confirmation status for all existing users
-- Set email_confirmed_at to now() for all users who haven't confirmed yet

UPDATE auth.users
SET email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Verify the update
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

