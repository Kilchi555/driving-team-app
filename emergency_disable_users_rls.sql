-- EMERGENCY: Temporarily disable RLS on users table to restore login
-- WARNING: This removes security temporarily - only for debugging!

-- Disable RLS temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Test message
DO $$
BEGIN
    RAISE NOTICE '⚠️ WARNING: RLS disabled on users table for emergency login fix';
    RAISE NOTICE 'This is TEMPORARY - re-enable RLS after testing!';
    RAISE NOTICE 'Try logging in now, then run fix_users_rls_login_emergency.sql';
END $$;



