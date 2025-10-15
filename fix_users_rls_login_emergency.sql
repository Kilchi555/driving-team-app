-- ========================================
-- EMERGENCY FIX: USERS RLS LOGIN ISSUE
-- ========================================
-- This script fixes the "Database error granting user" issue
-- by ensuring users can access their own profile during login

-- Step 1: Check current RLS policies on users table
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
WHERE tablename = 'users';

-- Step 2: Temporarily disable RLS to test
-- (ONLY for testing - re-enable immediately after)
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 3: Check if we can access users table
-- SELECT COUNT(*) FROM users WHERE is_active = true;

-- Step 4: Create/Update safe RLS policy for user profile access
-- Drop existing problematic policies
DROP POLICY IF EXISTS users_select_own ON users;
DROP POLICY IF EXISTS users_tenant_access ON users;
DROP POLICY IF EXISTS users_own_profile ON users;

-- Create new safe policy for user profile access
CREATE POLICY users_own_profile_access ON users
    FOR SELECT
    TO authenticated
    USING (
        auth_user_id = auth.uid()
        OR 
        -- Allow tenant-based access for admins
        (
            EXISTS (
                SELECT 1 FROM users admin_user 
                WHERE admin_user.auth_user_id = auth.uid() 
                AND admin_user.role IN ('admin', 'staff')
                AND admin_user.tenant_id = users.tenant_id
                AND admin_user.is_active = true
            )
        )
    );

-- Re-enable RLS (if it was disabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 5: Test the policy
DO $$
BEGIN
    -- Check if policies exist
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' 
        AND policyname = 'users_own_profile_access'
    ) THEN
        RAISE NOTICE '✅ users_own_profile_access policy created successfully';
    ELSE
        RAISE NOTICE '❌ Policy creation failed';
    END IF;
    
    RAISE NOTICE 'RLS policies updated for users table';
    RAISE NOTICE 'Users should now be able to access their own profiles during login';
END $$;











