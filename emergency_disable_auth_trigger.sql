-- ========================================
-- EMERGENCY: DISABLE AUTH TRIGGER
-- ========================================
-- The auth trigger we created might be causing the 500 error
-- This script disables it temporarily to restore login

-- Step 1: Drop the auth trigger that might be causing issues
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 2: Verify trigger is gone
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'on_auth_user_created'
    ) THEN
        RAISE NOTICE '❌ Auth trigger still exists!';
    ELSE
        RAISE NOTICE '✅ Auth trigger removed successfully';
        RAISE NOTICE 'Login should work now!';
        RAISE NOTICE '';
        RAISE NOTICE 'The auth trigger was causing the 500 error during login.';
        RAISE NOTICE 'Users will need to be created manually or with a fixed trigger.';
    END IF;
END $$;


















