-- Check RLS Policies and Constraints for users table

-- 1. Check if RLS is enabled on users table
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'users';

-- 2. List all RLS policies on users table
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
WHERE tablename = 'users'
ORDER BY policyname;

-- 3. Check table constraints
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'users'::regclass;

-- 4. Check table structure and indexes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 5. Check current user and session info
SELECT 
    current_user,
    session_user,
    current_database(),
    inet_server_addr(),
    inet_server_port();

-- 6. Check if current user can access users table
SELECT 
    has_table_privilege(current_user, 'users', 'SELECT') as can_select,
    has_table_privilege(current_user, 'users', 'INSERT') as can_insert,
    has_table_privilege(current_user, 'users', 'UPDATE') as can_update,
    has_table_privilege(current_user, 'users', 'DELETE') as can_delete;
