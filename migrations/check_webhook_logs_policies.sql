-- Check existing RLS policies on webhook_logs table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'webhook_logs'
ORDER BY policyname;
