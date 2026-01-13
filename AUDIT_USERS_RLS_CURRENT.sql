-- CHECK CURRENT RLS POLICIES ON USERS TABLE
-- See what policies exist and what's causing issues

SELECT 
  policyname, 
  tablename,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- Check if RLS is enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity
FROM pg_tables 
WHERE tablename = 'users';

