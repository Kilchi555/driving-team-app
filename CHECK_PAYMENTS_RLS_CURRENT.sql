-- Check current payments table RLS policies
SELECT 
  policyname,
  cmd,
  roles::text as "Roles",
  qual as "SELECT/USING Condition",
  with_check as "INSERT/UPDATE WITH CHECK Condition"
FROM pg_policies
WHERE tablename = 'payments'
ORDER BY cmd, policyname;

