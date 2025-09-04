-- Check RLS policies for categories table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'categories';

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'categories';

-- Check current user permissions
SELECT current_user, session_user;

-- Test direct update (run as superuser or table owner)
-- UPDATE categories SET lesson_duration_minutes = ARRAY[45, 90] WHERE id = 23;
