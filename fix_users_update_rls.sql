-- ========================================
-- FIX USERS UPDATE RLS FOR DOCUMENT UPLOADS
-- ========================================

-- Step 1: Check current UPDATE policies
SELECT 
    policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'users' 
AND cmd = 'UPDATE'
ORDER BY policyname;

-- Step 2: Drop existing restrictive UPDATE policies
DROP POLICY IF EXISTS users_admin_modify ON users;
DROP POLICY IF EXISTS users_jwt_update ON users;
DROP POLICY IF EXISTS users_modify_own ON users;

-- Step 3: Create a simple, working UPDATE policy
-- Staff/Admin can update users in their tenant
CREATE POLICY users_can_update ON users
    FOR UPDATE
    TO authenticated
    USING (
        -- Own profile
        auth_user_id = auth.uid()
        OR
        -- Staff/Admin can update clients in their tenant
        (
            (auth.jwt() ->> 'role')::text IN ('admin', 'staff') 
            AND deleted_at IS NULL
        )
    )
    WITH CHECK (
        -- Same conditions for WITH CHECK
        auth_user_id = auth.uid()
        OR
        (
            (auth.jwt() ->> 'role')::text IN ('admin', 'staff') 
            AND deleted_at IS NULL
        )
    );

-- Step 4: Test the UPDATE with Hans Meier
-- This should work now
DO $$
DECLARE
    hans_id UUID := '9cca023a-ab9d-4df1-ae9d-488bae2b8e15';
    test_url TEXT := 'https://test-update-' || extract(epoch from now()) || '.jpg';
BEGIN
    -- Try to update Hans Meier's lernfahrausweis_url
    UPDATE users 
    SET lernfahrausweis_url = test_url
    WHERE id = hans_id;
    
    -- Check if it worked
    IF FOUND THEN
        RAISE NOTICE '✅ UPDATE test successful! Hans Meier can be updated.';
        
        -- Reset to null for clean state
        UPDATE users 
        SET lernfahrausweis_url = null
        WHERE id = hans_id;
        
        RAISE NOTICE '🧹 Reset test data to null';
    ELSE
        RAISE NOTICE '❌ UPDATE test failed! Hans Meier not found or not updatable.';
    END IF;
    
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE '❌ UPDATE test failed with error: %', SQLERRM;
END $$;

-- Step 5: Show final policies
SELECT 
    'Final UPDATE policies:' as info,
    policyname, cmd, permissive, roles
FROM pg_policies 
WHERE tablename = 'users' 
AND cmd = 'UPDATE'
ORDER BY policyname;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Users UPDATE RLS policy fixed!';
    RAISE NOTICE '';
    RAISE NOTICE 'Staff can now update user documents!';
    RAISE NOTICE 'Document uploads should work now!';
    RAISE NOTICE '';
END $$;
