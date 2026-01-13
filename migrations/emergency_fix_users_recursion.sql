-- =====================================================
-- EMERGENCY FIX: Remove recursive users RLS policies
-- =====================================================
-- Problem: Policies queryen die users table innerhalb der users-RLS
-- Das verursacht infinite recursion!
--
-- Solution: Nur die sichere read_own_profile policy halten
-- Alles andere muss durch Backend-APIs mit service_role gehen

BEGIN;

-- Drop ALL the problematic policies that cause recursion
DROP POLICY IF EXISTS "admin_read_tenant_users" ON users;
DROP POLICY IF EXISTS "admin_update_tenant_users" ON users;
DROP POLICY IF EXISTS "super_admin_read_all_users" ON users;
DROP POLICY IF EXISTS "super_admin_update_all_users" ON users;
DROP POLICY IF EXISTS "user_update_own_profile" ON users;

-- Keep ONLY the safe, non-recursive policies
-- user_read_own_profile already exists
-- insert_users already exists
-- service_role_bypass already exists

COMMIT;

