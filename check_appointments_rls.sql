-- Check current RLS status and policies for appointments table

-- 1. Check if RLS is enabled on appointments table
SELECT 
  schemaname, 
  tablename, 
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'appointments'
ORDER BY tablename;

-- 2. Check all policies on appointments
SELECT 
  policyname, 
  tablename,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'appointments'
ORDER BY policyname;
