-- Check all existing RLS policies on categories table

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual as select_condition,
  with_check as insert_update_condition,
  cmd as command_type
FROM pg_policies 
WHERE tablename = 'categories'
ORDER BY policyname;

