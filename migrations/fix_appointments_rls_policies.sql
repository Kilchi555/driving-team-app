-- Migration: Fix RLS policies for appointments table
-- Description: Allow customers to read their own appointments, staff/admins to read their tenant appointments
-- Date: 2026-01-01

-- Enable RLS if not already enabled
ALTER TABLE IF EXISTS "public"."appointments" ENABLE ROW LEVEL SECURITY;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "appointments_select" ON "public"."appointments";
DROP POLICY IF EXISTS "appointments_insert" ON "public"."appointments";
DROP POLICY IF EXISTS "appointments_update" ON "public"."appointments";
DROP POLICY IF EXISTS "appointments_delete" ON "public"."appointments";

-- ============================================
-- CREATE CLEAN appointments Policies
-- ============================================

-- 1. AUTHENTICATED: Customers can read their own appointments
CREATE POLICY "customer_read_own_appointments" ON "public"."appointments"
  FOR SELECT TO authenticated
  USING (
    user_id = (
      SELECT id FROM users
      WHERE auth_user_id = auth.uid()
    )
  );

-- 2. AUTHENTICATED: Staff/Admins can read their tenant appointments
CREATE POLICY "staff_admin_read_tenant_appointments" ON "public"."appointments"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role IN ('admin', 'staff', 'tenant_admin', 'super_admin')
      AND (
        appointments.tenant_id = u.tenant_id
        OR u.role = 'super_admin'  -- super_admin can see all
      )
    )
  );

-- 3. AUTHENTICATED: Customers can insert their own appointments
CREATE POLICY "customer_insert_own_appointments" ON "public"."appointments"
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (
      SELECT id FROM users
      WHERE auth_user_id = auth.uid()
    )
  );

-- 4. AUTHENTICATED: Staff/Admins can insert appointments for their tenant
CREATE POLICY "staff_admin_insert_tenant_appointments" ON "public"."appointments"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role IN ('admin', 'staff', 'tenant_admin', 'super_admin')
      AND (
        appointments.tenant_id = u.tenant_id
        OR u.role = 'super_admin'
      )
    )
  );

-- 5. AUTHENTICATED: Customers can update their own appointments
CREATE POLICY "customer_update_own_appointments" ON "public"."appointments"
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

-- 6. AUTHENTICATED: Staff/Admins can update their tenant appointments
CREATE POLICY "staff_admin_update_tenant_appointments" ON "public"."appointments"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role IN ('admin', 'staff', 'tenant_admin', 'super_admin')
      AND (
        appointments.tenant_id = u.tenant_id
        OR u.role = 'super_admin'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role IN ('admin', 'staff', 'tenant_admin', 'super_admin')
      AND (
        appointments.tenant_id = u.tenant_id
        OR u.role = 'super_admin'
      )
    )
  );

-- 7. AUTHENTICATED: Customers can delete their own appointments
CREATE POLICY "customer_delete_own_appointments" ON "public"."appointments"
  FOR DELETE TO authenticated
  USING (
    user_id = (
      SELECT id FROM users
      WHERE auth_user_id = auth.uid()
    )
  );

-- 8. AUTHENTICATED: Staff/Admins can delete their tenant appointments
CREATE POLICY "staff_admin_delete_tenant_appointments" ON "public"."appointments"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role IN ('admin', 'staff', 'tenant_admin', 'super_admin')
      AND (
        appointments.tenant_id = u.tenant_id
        OR u.role = 'super_admin'
      )
    )
  );

-- 9. SERVICE_ROLE: Full access for backend operations
CREATE POLICY "service_role_manage_appointments" ON "public"."appointments"
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 10. ANON: Can read public appointment slots (for booking calendar)
CREATE POLICY "anon_read_public_appointments" ON "public"."appointments"
  FOR SELECT TO anon
  USING (
    -- Allow reading appointments that are marked as public bookable slots
    is_bookable = true
  );

COMMIT;

