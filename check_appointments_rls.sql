-- Check RLS policies for appointments table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'appointments' 
ORDER BY policyname;

-- Also check if RLS is enabled on appointments
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'appointments';
