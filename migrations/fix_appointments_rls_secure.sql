-- =====================================================
-- FIX: appointments RLS - Restrict customers to own appointments
-- =====================================================
-- Problem: customers_select_policy allowed ALL customers to see ALL appointments in their tenant
-- Solution: Add customer-specific policies + super_admin policies + service_role bypass

BEGIN;

-- Drop existing policies (they're too open)
DROP POLICY IF EXISTS "appointments_select_policy" ON appointments;
DROP POLICY IF EXISTS "appointments_insert_policy" ON appointments;
DROP POLICY IF EXISTS "appointments_update_policy" ON appointments;

-- ============================================
-- CREATE SECURE appointments Policies
-- ============================================

-- 1. CUSTOMERS: Can read their OWN appointments only
CREATE POLICY "customer_read_own_appointments" ON appointments
  FOR SELECT TO authenticated
  USING (
    user_id = (
      SELECT id FROM users
      WHERE auth_user_id = auth.uid()
    )
  );

-- 2. ADMIN/STAFF/TENANT_ADMIN: Can read their tenant appointments
CREATE POLICY "admin_read_tenant_appointments" ON appointments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role IN ('admin', 'staff', 'tenant_admin')
      AND u.is_active = true
      AND u.tenant_id = appointments.tenant_id
    )
  );

-- 3. SUPER_ADMIN: Can read ALL appointments
CREATE POLICY "super_admin_read_all_appointments" ON appointments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

-- 4. ADMIN/STAFF/TENANT_ADMIN: Can insert appointments for their tenant
CREATE POLICY "admin_insert_tenant_appointments" ON appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role IN ('admin', 'staff', 'tenant_admin')
      AND u.is_active = true
      AND u.tenant_id = appointments.tenant_id
    )
  );

-- 5. CUSTOMERS: Can insert their own appointments
CREATE POLICY "customer_insert_own_appointments" ON appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (
      SELECT id FROM users
      WHERE auth_user_id = auth.uid()
    )
  );

-- 6. SUPER_ADMIN: Can insert appointments
CREATE POLICY "super_admin_insert_appointments" ON appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

-- 7. ADMIN/STAFF/TENANT_ADMIN: Can update appointments for their tenant
CREATE POLICY "admin_update_tenant_appointments" ON appointments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role IN ('admin', 'staff', 'tenant_admin')
      AND u.is_active = true
      AND u.tenant_id = appointments.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role IN ('admin', 'staff', 'tenant_admin')
      AND u.is_active = true
      AND u.tenant_id = appointments.tenant_id
    )
  );

-- 8. CUSTOMERS: Can update their own appointments
CREATE POLICY "customer_update_own_appointments" ON appointments
  FOR UPDATE TO authenticated
  USING (
    user_id = (
      SELECT id FROM users
      WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = (
      SELECT id FROM users
      WHERE auth_user_id = auth.uid()
    )
  );

-- 9. SUPER_ADMIN: Can update ALL appointments
CREATE POLICY "super_admin_update_all_appointments" ON appointments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

-- 10. ADMIN/STAFF/TENANT_ADMIN: Can delete appointments for their tenant
CREATE POLICY "admin_delete_tenant_appointments" ON appointments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role IN ('admin', 'staff', 'tenant_admin')
      AND u.is_active = true
      AND u.tenant_id = appointments.tenant_id
    )
  );

-- 11. CUSTOMERS: Can delete their own appointments
CREATE POLICY "customer_delete_own_appointments" ON appointments
  FOR DELETE TO authenticated
  USING (
    user_id = (
      SELECT id FROM users
      WHERE auth_user_id = auth.uid()
    )
  );

-- 12. SUPER_ADMIN: Can delete ALL appointments
CREATE POLICY "super_admin_delete_all_appointments" ON appointments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

-- 13. SERVICE_ROLE: Full access for backend operations
CREATE POLICY "service_role_manage_appointments" ON appointments
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 14. ANON: Can read bookable appointments (for public booking calendar)
CREATE POLICY "anon_read_bookable_appointments" ON appointments
  FOR SELECT TO anon
  USING (
    is_bookable = true AND
    start_time > now()
  );

COMMIT;

