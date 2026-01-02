-- =====================================================
-- FIX: users table RLS - Close critical data leak
-- =====================================================
-- Problem: "staff_admin_read_tenant_users" policy allowed ALL authenticated users to read ALL users
-- Solution: Restrict to only own profile + admin/staff/tenant_admin for their tenant + super_admin for all

BEGIN;

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "staff_admin_read_tenant_users" ON users;
DROP POLICY IF EXISTS "delete_own_data" ON users;

-- ============================================
-- CREATE SECURE users Policies
-- ============================================

-- 1. Users can read their OWN profile only
CREATE POLICY "user_read_own_profile" ON users
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- 2. Admin/Staff/Tenant_Admin can read their tenant users
CREATE POLICY "admin_read_tenant_users" ON users
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role IN ('admin', 'staff', 'tenant_admin')
      AND u.is_active = true
      AND u.tenant_id = users.tenant_id
    )
  );

-- 3. Super_Admin can read ALL users
CREATE POLICY "super_admin_read_all_users" ON users
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

-- 4. Users can update their OWN profile only
CREATE POLICY "user_update_own_profile" ON users
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- 5. Admin/Staff/Tenant_Admin can update their tenant users
CREATE POLICY "admin_update_tenant_users" ON users
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role IN ('admin', 'staff', 'tenant_admin')
      AND u.is_active = true
      AND u.tenant_id = users.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role IN ('admin', 'staff', 'tenant_admin')
      AND u.is_active = true
      AND u.tenant_id = users.tenant_id
    )
  );

-- 6. Super_Admin can update ALL users
CREATE POLICY "super_admin_update_all_users" ON users
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

-- 7. Keep existing insert_users policy (self-registration + admin create)
-- (No changes needed - it's already secure)

-- 8. Keep existing service_role_bypass policy
-- (Backend operations need full access)

-- 9. REMOVE: delete_own_data was allowing auth_user_id IS NULL (anonymous deletes)
-- Users should NOT be able to delete their own profile!
-- (If needed, use backend API with proper validation)

COMMIT;

