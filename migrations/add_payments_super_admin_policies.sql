-- =====================================================
-- ADD: super_admin policies for payments table
-- =====================================================

BEGIN;

-- 1. SUPER_ADMIN: Can read ALL payments
CREATE POLICY "super_admin_read_all_payments" ON payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

-- 2. SUPER_ADMIN: Can insert payments
CREATE POLICY "super_admin_insert_payments" ON payments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

-- 3. SUPER_ADMIN: Can update payments
CREATE POLICY "super_admin_update_payments" ON payments
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

-- 4. SUPER_ADMIN: Can delete payments
CREATE POLICY "super_admin_delete_payments" ON payments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

-- 5. SERVICE_ROLE: Full access for backend operations
CREATE POLICY "service_role_manage_payments" ON payments
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;

