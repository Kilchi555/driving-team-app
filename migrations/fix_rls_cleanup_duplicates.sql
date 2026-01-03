-- =====================================================
-- FIX RLS POLICIES: Remove duplicates & optimize
-- =====================================================

-- PHASE 1: Disable RLS temporarily to drop policies
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;

-- PHASE 2: Drop ALL existing policies (we'll recreate cleanly)

-- Users policies
DROP POLICY IF EXISTS "User self read" ON public.users;
DROP POLICY IF EXISTS "User self update" ON public.users;
DROP POLICY IF EXISTS "Users can read their own profile" ON public.users;
DROP POLICY IF EXISTS "user_read_own_profile" ON public.users;
DROP POLICY IF EXISTS "user_update_own_profile" ON public.users;
DROP POLICY IF EXISTS "Service role read" ON public.users;
DROP POLICY IF EXISTS "Service role update" ON public.users;
DROP POLICY IF EXISTS "Service role insert" ON public.users;
DROP POLICY IF EXISTS "Service role delete" ON public.users;
DROP POLICY IF EXISTS "service_role_bypass" ON public.users;
DROP POLICY IF EXISTS "insert_users" ON public.users;

-- Appointments policies
DROP POLICY IF EXISTS "customer_read_own_appointments" ON public.appointments;
DROP POLICY IF EXISTS "customer_update_own_appointments" ON public.appointments;
DROP POLICY IF EXISTS "customer_insert_own_appointments" ON public.appointments;
DROP POLICY IF EXISTS "customer_delete_own_appointments" ON public.appointments;
DROP POLICY IF EXISTS "admin_read_tenant_appointments" ON public.appointments;
DROP POLICY IF EXISTS "admin_update_tenant_appointments" ON public.appointments;
DROP POLICY IF EXISTS "admin_insert_tenant_appointments" ON public.appointments;
DROP POLICY IF EXISTS "admin_delete_tenant_appointments" ON public.appointments;
DROP POLICY IF EXISTS "super_admin_read_all_appointments" ON public.appointments;
DROP POLICY IF EXISTS "super_admin_update_all_appointments" ON public.appointments;
DROP POLICY IF EXISTS "super_admin_insert_appointments" ON public.appointments;
DROP POLICY IF EXISTS "super_admin_delete_all_appointments" ON public.appointments;
DROP POLICY IF EXISTS "service_role_manage_appointments" ON public.appointments;

-- Payments policies
DROP POLICY IF EXISTS "clients_read_own_payments" ON public.payments;
DROP POLICY IF EXISTS "clients_update_own_payments" ON public.payments;
DROP POLICY IF EXISTS "clients_delete_own_payments" ON public.payments;
DROP POLICY IF EXISTS "staff_read_tenant_payments" ON public.payments;
DROP POLICY IF EXISTS "staff_update_tenant_payments" ON public.payments;
DROP POLICY IF EXISTS "staff_delete_tenant_payments" ON public.payments;
DROP POLICY IF EXISTS "superadmin_read_all_payments" ON public.payments;
DROP POLICY IF EXISTS "superadmin_update_all_payments" ON public.payments;
DROP POLICY IF EXISTS "superadmin_delete_all_payments" ON public.payments;
DROP POLICY IF EXISTS "service_role_full_access" ON public.payments;

-- PHASE 3: Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- PHASE 4: Create CLEAN, MINIMAL policies (no duplicates, no recursion)

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================

-- 1. Users can read their OWN profile (via auth_user_id)
CREATE POLICY "user_read_own" ON public.users
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- 2. Users can update their OWN profile
CREATE POLICY "user_update_own" ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- 3. Service role has full access (backend APIs)
CREATE POLICY "service_role_all" ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- APPOINTMENTS TABLE POLICIES
-- =====================================================

-- 1. Customers read their OWN appointments (direct auth.uid() check)
CREATE POLICY "customer_read_own" ON public.appointments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2. Customers update their OWN appointments
CREATE POLICY "customer_update_own" ON public.appointments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. Customers delete their OWN appointments
CREATE POLICY "customer_delete_own" ON public.appointments
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 4. Customers insert their OWN appointments
CREATE POLICY "customer_insert_own" ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 5. Staff/Admin read appointments in THEIR TENANT
CREATE POLICY "staff_read_tenant" ON public.appointments
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users
      WHERE auth_user_id = auth.uid()
        AND role = ANY(ARRAY['staff', 'admin', 'tenant_admin'])
        AND is_active = true
    )
  );

-- 6. Staff/Admin update appointments in THEIR TENANT
CREATE POLICY "staff_update_tenant" ON public.appointments
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users
      WHERE auth_user_id = auth.uid()
        AND role = ANY(ARRAY['staff', 'admin', 'tenant_admin'])
        AND is_active = true
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users
      WHERE auth_user_id = auth.uid()
        AND role = ANY(ARRAY['staff', 'admin', 'tenant_admin'])
        AND is_active = true
    )
  );

-- 7. Staff/Admin delete appointments in THEIR TENANT
CREATE POLICY "staff_delete_tenant" ON public.appointments
  FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users
      WHERE auth_user_id = auth.uid()
        AND role = ANY(ARRAY['staff', 'admin', 'tenant_admin'])
        AND is_active = true
    )
  );

-- 8. Staff/Admin insert appointments in THEIR TENANT
CREATE POLICY "staff_insert_tenant" ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users
      WHERE auth_user_id = auth.uid()
        AND role = ANY(ARRAY['staff', 'admin', 'tenant_admin'])
        AND is_active = true
    )
  );

-- 9. Super admin read all appointments
CREATE POLICY "super_admin_read_all" ON public.appointments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'superadmin'
    )
  );

-- 10. Super admin update all appointments
CREATE POLICY "super_admin_update_all" ON public.appointments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'superadmin'
    )
  );

-- 11. Super admin insert all appointments
CREATE POLICY "super_admin_insert_all" ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'superadmin'
    )
  );

-- 12. Super admin delete all appointments
CREATE POLICY "super_admin_delete_all" ON public.appointments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'superadmin'
    )
  );

-- 13. Service role has full access (backend APIs)
CREATE POLICY "service_role_all" ON public.appointments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- PAYMENTS TABLE POLICIES
-- =====================================================

-- 1. Customers read their OWN payments
CREATE POLICY "customer_read_own" ON public.payments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2. Customers update their OWN payments
CREATE POLICY "customer_update_own" ON public.payments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. Customers delete their OWN payments
CREATE POLICY "customer_delete_own" ON public.payments
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 4. Customers insert their OWN payments
CREATE POLICY "customer_insert_own" ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 5. Staff/Admin read payments in THEIR TENANT
CREATE POLICY "staff_read_tenant" ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users
      WHERE auth_user_id = auth.uid()
        AND role = ANY(ARRAY['staff', 'admin', 'tenant_admin'])
        AND is_active = true
    )
  );

-- 6. Staff/Admin update payments in THEIR TENANT
CREATE POLICY "staff_update_tenant" ON public.payments
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users
      WHERE auth_user_id = auth.uid()
        AND role = ANY(ARRAY['staff', 'admin', 'tenant_admin'])
        AND is_active = true
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users
      WHERE auth_user_id = auth.uid()
        AND role = ANY(ARRAY['staff', 'admin', 'tenant_admin'])
        AND is_active = true
    )
  );

-- 7. Staff/Admin delete payments in THEIR TENANT
CREATE POLICY "staff_delete_tenant" ON public.payments
  FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users
      WHERE auth_user_id = auth.uid()
        AND role = ANY(ARRAY['staff', 'admin', 'tenant_admin'])
        AND is_active = true
    )
  );

-- 8. Staff/Admin insert payments in THEIR TENANT
CREATE POLICY "staff_insert_tenant" ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users
      WHERE auth_user_id = auth.uid()
        AND role = ANY(ARRAY['staff', 'admin', 'tenant_admin'])
        AND is_active = true
    )
  );

-- 9. Super admin read all payments
CREATE POLICY "super_admin_read_all" ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'superadmin'
    )
  );

-- 10. Super admin update all payments
CREATE POLICY "super_admin_update_all" ON public.payments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'superadmin'
    )
  );

-- 11. Super admin delete all payments
CREATE POLICY "super_admin_delete_all" ON public.payments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'superadmin'
    )
  );

-- 12. Super admin insert all payments
CREATE POLICY "super_admin_insert_all" ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'superadmin'
    )
  );

-- 13. Service role has full access (backend APIs)
CREATE POLICY "service_role_all" ON public.payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

