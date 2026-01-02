-- Migration: Fix appointments RLS to allow customers & super_admin
-- Description: Add missing policies for customer read access and super_admin
-- Date: 2026-01-01

-- ============================================
-- ADD MISSING POLICIES (don't drop existing!)
-- ============================================

-- 1. CUSTOMERS: Can read their own appointments
CREATE POLICY IF NOT EXISTS "customer_read_own_appointments" ON "public"."appointments"
  FOR SELECT TO authenticated
  USING (
    user_id = (
      SELECT id FROM users
      WHERE auth_user_id = auth.uid()
    )
  );

-- 2. SUPER_ADMIN: Can read all appointments
CREATE POLICY IF NOT EXISTS "super_admin_read_all_appointments" ON "public"."appointments"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

-- 3. SUPER_ADMIN: Can insert appointments
CREATE POLICY IF NOT EXISTS "super_admin_insert_appointments" ON "public"."appointments"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

-- 4. SUPER_ADMIN: Can update appointments
CREATE POLICY IF NOT EXISTS "super_admin_update_appointments" ON "public"."appointments"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

-- 5. SUPER_ADMIN: Can delete appointments
CREATE POLICY IF NOT EXISTS "super_admin_delete_appointments" ON "public"."appointments"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

-- 6. SERVICE_ROLE: Full access for backend operations
CREATE POLICY IF NOT EXISTS "service_role_manage_appointments" ON "public"."appointments"
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;

