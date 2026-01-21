-- Check current RLS status on users table
-- This is causing the 406 Not Acceptable error

-- 1. Check if RLS is enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'users';

-- 2. Check all policies on users table
SELECT 
  policyname, 
  tablename,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- 3. Check specific issue - can authenticated users read their own user record?
-- Try to select from users table for current user
SELECT id, auth_user_id, email, first_name, last_name 
FROM users 
WHERE auth_user_id = auth.uid()
LIMIT 1;

-- 4. Check if there's a policy issue with the specific user
SELECT id, auth_user_id, email, first_name, last_name
FROM users
WHERE id = '7b1fee8e-981b-4139-8413-9b5079c04b52'
LIMIT 1;
