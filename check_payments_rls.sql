-- Check RLS policies for payments table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'payments' 
ORDER BY policyname;

-- Also check if RLS is enabled on payments
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'payments';
