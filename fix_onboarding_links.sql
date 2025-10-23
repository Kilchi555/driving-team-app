-- Fix onboarding links in database
-- This script ensures all onboarding links use the correct domain

-- Check current onboarding tokens and their status
SELECT 
  id,
  first_name,
  last_name,
  email,
  onboarding_status,
  onboarding_token,
  onboarding_token_expires,
  created_at
FROM users 
WHERE onboarding_status = 'pending' 
  AND onboarding_token IS NOT NULL
ORDER BY created_at DESC;

-- Note: The actual links are generated dynamically in the application code
-- This query just shows the current state of pending onboarding users
