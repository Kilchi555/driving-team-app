-- =====================================================
-- CLEANUP: Delete OLD unsecure appointments policies
-- =====================================================

BEGIN;

-- First, DELETE ALL old policies
DROP POLICY IF EXISTS "appointments_select_policy" ON appointments;
DROP POLICY IF EXISTS "appointments_insert_policy" ON appointments;
DROP POLICY IF EXISTS "appointments_update_policy" ON appointments;

-- Delete any new policies we tried to create
DROP POLICY IF EXISTS "customer_read_own_appointments" ON appointments;
DROP POLICY IF EXISTS "admin_read_tenant_appointments" ON appointments;
DROP POLICY IF EXISTS "super_admin_read_all_appointments" ON appointments;
DROP POLICY IF EXISTS "admin_insert_tenant_appointments" ON appointments;
DROP POLICY IF EXISTS "customer_insert_own_appointments" ON appointments;
DROP POLICY IF EXISTS "super_admin_insert_appointments" ON appointments;
DROP POLICY IF EXISTS "admin_update_tenant_appointments" ON appointments;
DROP POLICY IF EXISTS "customer_update_own_appointments" ON appointments;
DROP POLICY IF EXISTS "super_admin_update_all_appointments" ON appointments;
DROP POLICY IF EXISTS "admin_delete_tenant_appointments" ON appointments;
DROP POLICY IF EXISTS "customer_delete_own_appointments" ON appointments;
DROP POLICY IF EXISTS "super_admin_delete_all_appointments" ON appointments;
DROP POLICY IF EXISTS "service_role_manage_appointments" ON appointments;
DROP POLICY IF EXISTS "anon_read_bookable_appointments" ON appointments;

COMMIT;

