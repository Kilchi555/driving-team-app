-- ==============================================================
-- FIX: Appointments RLS - Final Working Version
-- ==============================================================
-- This migration ensures customers can read their own appointments
-- and staff/admins can read appointments from their tenant
-- 
-- Status: TESTED - Used to fix 406 Not Acceptable errors
-- ==============================================================

BEGIN;

-- Drop ALL existing policies to start completely fresh
DROP POLICY IF EXISTS "appointments_select_policy" ON appointments;
DROP POLICY IF EXISTS "appointments_insert_policy" ON appointments;
DROP POLICY IF EXISTS "appointments_update_policy" ON appointments;
DROP POLICY IF EXISTS "appointments_delete_policy" ON appointments;
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
DROP POLICY IF EXISTS "Allow all authenticated access to appointments" ON appointments;
DROP POLICY IF EXISTS "Allow all authenticated users to view appointments" ON appointments;
DROP POLICY IF EXISTS "Allow staff to create appointments" ON appointments;
DROP POLICY IF EXISTS "Allow staff to update appointments" ON appointments;
DROP POLICY IF EXISTS "Allow staff to delete appointments" ON appointments;

-- Ensure RLS is enabled
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- ==============================================================
-- SIMPLE, WORKING POLICIES
-- ==============================================================

-- 1. CUSTOMERS: Can read their OWN appointments
-- Matches: appointments.user_id = users.id WHERE users.auth_user_id = auth.uid()
CREATE POLICY "customer_read_own_appointments" ON appointments
  FOR SELECT TO authenticated
  USING (
    user_id = (
      SELECT id FROM public.users
      WHERE auth_user_id = auth.uid() AND is_active = true
      LIMIT 1
    )
  );

-- 2. STAFF/ADMINS: Can read appointments from their tenant
CREATE POLICY "staff_read_tenant_appointments" ON appointments
  FOR SELECT TO authenticated
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'staff', 'tenant_admin')
      AND is_active = true
      LIMIT 1
    )
  );

-- 3. SUPER_ADMIN: Can read ALL appointments
CREATE POLICY "super_admin_read_all_appointments" ON appointments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
      AND u.is_active = true
    )
  );

-- 4. SERVICE_ROLE: Full access (backend APIs)
CREATE POLICY "service_role_manage_appointments" ON appointments
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. CUSTOMERS: Can insert their own appointments
CREATE POLICY "customer_insert_own_appointments" ON appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (
      SELECT id FROM public.users
      WHERE auth_user_id = auth.uid() AND is_active = true
      LIMIT 1
    )
  );

-- 6. STAFF/ADMINS: Can insert appointments for their tenant
CREATE POLICY "staff_insert_tenant_appointments" ON appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'staff', 'tenant_admin')
      AND is_active = true
      LIMIT 1
    )
  );

-- 7. SUPER_ADMIN: Can insert appointments
CREATE POLICY "super_admin_insert_appointments" ON appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
      AND u.is_active = true
    )
  );

-- 8. CUSTOMERS: Can update their own appointments
CREATE POLICY "customer_update_own_appointments" ON appointments
  FOR UPDATE TO authenticated
  USING (
    user_id = (
      SELECT id FROM public.users
      WHERE auth_user_id = auth.uid() AND is_active = true
      LIMIT 1
    )
  )
  WITH CHECK (
    user_id = (
      SELECT id FROM public.users
      WHERE auth_user_id = auth.uid() AND is_active = true
      LIMIT 1
    )
  );

-- 9. STAFF/ADMINS: Can update appointments in their tenant
CREATE POLICY "staff_update_tenant_appointments" ON appointments
  FOR UPDATE TO authenticated
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'staff', 'tenant_admin')
      AND is_active = true
      LIMIT 1
    )
  )
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'staff', 'tenant_admin')
      AND is_active = true
      LIMIT 1
    )
  );

-- 10. SUPER_ADMIN: Can update ALL appointments
CREATE POLICY "super_admin_update_all_appointments" ON appointments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
      AND u.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
      AND u.is_active = true
    )
  );

-- 11. CUSTOMERS: Can delete their own appointments
CREATE POLICY "customer_delete_own_appointments" ON appointments
  FOR DELETE TO authenticated
  USING (
    user_id = (
      SELECT id FROM public.users
      WHERE auth_user_id = auth.uid() AND is_active = true
      LIMIT 1
    )
  );

-- 12. STAFF/ADMINS: Can delete appointments in their tenant
CREATE POLICY "staff_delete_tenant_appointments" ON appointments
  FOR DELETE TO authenticated
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'staff', 'tenant_admin')
      AND is_active = true
      LIMIT 1
    )
  );

-- 13. SUPER_ADMIN: Can delete ALL appointments
CREATE POLICY "super_admin_delete_all_appointments" ON appointments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
      AND u.is_active = true
    )
  );

-- 14. ANON: Can read bookable appointments (for public booking)
CREATE POLICY "anon_read_bookable_appointments" ON appointments
  FOR SELECT TO anon
  USING (
    is_bookable = true AND start_time > now()
  );

COMMIT;

