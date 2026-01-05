-- ==============================================================
-- FIX: Payments RLS - Critical Bug Fix
-- ==============================================================
-- Problem: Policies compared user_id = auth.uid() 
--          But user_id is a reference to users.id, NOT auth_user_id
--          This caused 406 errors and incorrect access checks
--
-- Solution: Use proper mapping through users table
-- ==============================================================

BEGIN;

-- Drop ALL existing policies to start clean
DROP POLICY IF EXISTS "payments_select" ON payments;
DROP POLICY IF EXISTS "payments_insert" ON payments;
DROP POLICY IF EXISTS "payments_update" ON payments;
DROP POLICY IF EXISTS "payments_delete" ON payments;
DROP POLICY IF EXISTS "payments_select_own" ON payments;
DROP POLICY IF EXISTS "payments_select_staff" ON payments;
DROP POLICY IF EXISTS "payments_insert_own" ON payments;
DROP POLICY IF EXISTS "payments_insert_staff" ON payments;
DROP POLICY IF EXISTS "payments_update_own" ON payments;
DROP POLICY IF EXISTS "payments_update_staff" ON payments;
DROP POLICY IF EXISTS "payments_delete_own" ON payments;
DROP POLICY IF EXISTS "payments_delete_staff" ON payments;
DROP POLICY IF EXISTS "payments_select_client" ON payments;
DROP POLICY IF EXISTS "payments_select_staff_admin" ON payments;
DROP POLICY IF EXISTS "payments_insert_client" ON payments;
DROP POLICY IF EXISTS "payments_insert_staff_admin" ON payments;
DROP POLICY IF EXISTS "payments_update_client" ON payments;
DROP POLICY IF EXISTS "payments_update_staff_admin" ON payments;
DROP POLICY IF EXISTS "payments_delete_client" ON payments;
DROP POLICY IF EXISTS "payments_delete_staff_admin" ON payments;
DROP POLICY IF EXISTS "Authenticated users can read their own payments" ON payments;
DROP POLICY IF EXISTS "Authenticated users can update their own payments" ON payments;
DROP POLICY IF EXISTS "Service role full access to payments" ON payments;
DROP POLICY IF EXISTS "Super admin full access to payments" ON payments;
DROP POLICY IF EXISTS "Staff and admin read payments in their tenant" ON payments;
DROP POLICY IF EXISTS "super_admin_read_all_payments" ON payments;
DROP POLICY IF EXISTS "super_admin_insert_payments" ON payments;
DROP POLICY IF EXISTS "super_admin_update_payments" ON payments;
DROP POLICY IF EXISTS "super_admin_delete_payments" ON payments;
DROP POLICY IF EXISTS "service_role_manage_payments" ON payments;

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- ==============================================================
-- CORRECTED POLICIES
-- ==============================================================

-- 1. CUSTOMERS: Can read their OWN payments
-- IMPORTANT: payments.user_id references users.id, not auth.uid()
-- So we need to look up users.id from auth_user_id
CREATE POLICY "payments_customer_read" ON payments
  FOR SELECT TO authenticated
  USING (
    user_id = (
      SELECT id FROM public.users
      WHERE auth_user_id = auth.uid() AND is_active = true
      LIMIT 1
    )
  );

-- 2. STAFF/ADMINS: Can read payments in their tenant
CREATE POLICY "payments_staff_read" ON payments
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

-- 3. SUPER_ADMIN: Can read ALL payments
CREATE POLICY "payments_super_admin_read" ON payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
      AND u.is_active = true
    )
  );

-- 4. SERVICE_ROLE: Full access for backend APIs
CREATE POLICY "payments_service_role" ON payments
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. CUSTOMERS: Can insert their own payments
CREATE POLICY "payments_customer_insert" ON payments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (
      SELECT id FROM public.users
      WHERE auth_user_id = auth.uid() AND is_active = true
      LIMIT 1
    )
  );

-- 6. STAFF/ADMINS: Can insert payments in their tenant
CREATE POLICY "payments_staff_insert" ON payments
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

-- 7. CUSTOMERS: Can update their own payments
CREATE POLICY "payments_customer_update" ON payments
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

-- 8. STAFF/ADMINS: Can update payments in their tenant
CREATE POLICY "payments_staff_update" ON payments
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

-- 9. SUPER_ADMIN: Can update ALL payments
CREATE POLICY "payments_super_admin_update" ON payments
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

-- 10. CUSTOMERS: Can delete their own payments
CREATE POLICY "payments_customer_delete" ON payments
  FOR DELETE TO authenticated
  USING (
    user_id = (
      SELECT id FROM public.users
      WHERE auth_user_id = auth.uid() AND is_active = true
      LIMIT 1
    )
  );

-- 11. STAFF/ADMINS: Can delete payments in their tenant
CREATE POLICY "payments_staff_delete" ON payments
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

-- 12. SUPER_ADMIN: Can delete ALL payments
CREATE POLICY "payments_super_admin_delete" ON payments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
      AND u.is_active = true
    )
  );

COMMIT;

