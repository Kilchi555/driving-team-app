-- =====================================================
-- CLEANUP: Remove duplicate and unsafe policies from users table
-- =====================================================

BEGIN;

-- Drop duplicate policies
DROP POLICY IF EXISTS "users_read_own" ON users;

-- Drop unsafe policy that allows auth_user_id IS NULL (anonymous updates)
DROP POLICY IF EXISTS "update_own_data" ON users;

-- Drop the delete policy we removed earlier (should not exist)
DROP POLICY IF EXISTS "delete_own_data" ON users;

COMMIT;

