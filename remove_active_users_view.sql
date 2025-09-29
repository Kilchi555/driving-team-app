-- Remove active_users VIEW
-- This VIEW is no longer needed as we query users table directly with deleted_at IS NULL

-- Drop the active_users view
DROP VIEW IF EXISTS active_users;

-- Verify it's gone
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'active_users'
    ) THEN
        RAISE NOTICE '❌ active_users view still exists!';
    ELSE
        RAISE NOTICE '✅ active_users view successfully removed';
        RAISE NOTICE '';
        RAISE NOTICE 'Code now uses: SELECT * FROM users WHERE deleted_at IS NULL';
        RAISE NOTICE 'Instead of: SELECT * FROM active_users';
    END IF;
END $$;
