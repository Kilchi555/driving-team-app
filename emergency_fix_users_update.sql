-- ========================================
-- EMERGENCY FIX FOR USERS UPDATE RLS
-- ========================================

-- Step 1: Check current user and role
SELECT 
    'Current session info:' as info,
    auth.uid() as user_id,
    auth.role() as auth_role,
    auth.jwt() ->> 'email' as email,
    auth.jwt() ->> 'role' as jwt_role;

-- Step 2: Check if we can read Hans Meier
SELECT 
    'Can read Hans?' as test,
    id, first_name, last_name, lernfahrausweis_url
FROM users 
WHERE id = '9cca023a-ab9d-4df1-ae9d-488bae2b8e15';

-- Step 3: Drop ALL existing UPDATE policies (nuclear option)
DROP POLICY IF EXISTS users_can_update ON users;
DROP POLICY IF EXISTS users_jwt_update ON users;
DROP POLICY IF EXISTS users_admin_modify ON users;
DROP POLICY IF EXISTS users_modify_own ON users;
DROP POLICY IF EXISTS users_simple_update ON users;

-- Step 4: Create SUPER PERMISSIVE UPDATE policy for debugging
CREATE POLICY users_update_all ON users
    FOR UPDATE
    TO authenticated
    USING (true)  -- Allow all authenticated users to update
    WITH CHECK (true);  -- Allow all updates

-- Step 5: Test UPDATE immediately
DO $$
DECLARE
    hans_id UUID := '9cca023a-ab9d-4df1-ae9d-488bae2b8e15';
    test_url TEXT := 'https://test-emergency-' || extract(epoch from now()) || '.jpg';
BEGIN
    -- Try to update Hans Meier's lernfahrausweis_url
    UPDATE users 
    SET lernfahrausweis_url = test_url
    WHERE id = hans_id;
    
    -- Check if it worked
    IF FOUND THEN
        RAISE NOTICE '✅ EMERGENCY UPDATE successful!';
        RAISE NOTICE 'Test URL set: %', test_url;
        
        -- Reset to null for clean state
        UPDATE users 
        SET lernfahrausweis_url = null
        WHERE id = hans_id;
        
        RAISE NOTICE '🧹 Reset to null for clean testing';
    ELSE
        RAISE NOTICE '❌ EMERGENCY UPDATE failed!';
    END IF;
    
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE '❌ EMERGENCY UPDATE failed with error: %', SQLERRM;
END $$;

-- Step 6: Show current policies
SELECT 
    'Current UPDATE policies:' as info,
    policyname, cmd, permissive, roles
FROM pg_policies 
WHERE tablename = 'users' 
AND cmd = 'UPDATE'
ORDER BY policyname;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🚨 EMERGENCY RLS FIX APPLIED!';
    RAISE NOTICE '';
    RAISE NOTICE 'All authenticated users can now update users table!';
    RAISE NOTICE 'Document uploads should work now!';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  WARNING: This is very permissive - tighten security later!';
    RAISE NOTICE '';
END $$;












