-- CLEANUP: Remove all old/duplicate payments RLS policies
-- Then apply clean, minimal policies

-- Step 1: Disable RLS to clean up
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies
DROP POLICY IF EXISTS "Service role full access to payments" ON public.payments;
DROP POLICY IF EXISTS "Super admin full access to payments" ON public.payments;
DROP POLICY IF EXISTS "service_role_manage_payments" ON public.payments;
DROP POLICY IF EXISTS "payments_delete_client" ON public.payments;
DROP POLICY IF EXISTS "payments_delete_staff_admin" ON public.payments;
DROP POLICY IF EXISTS "super_admin_delete_payments" ON public.payments;
DROP POLICY IF EXISTS "payments_insert_client" ON public.payments;
DROP POLICY IF EXISTS "payments_insert_staff_admin" ON public.payments;
DROP POLICY IF EXISTS "super_admin_insert_payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can read their own payments" ON public.payments;
DROP POLICY IF EXISTS "Staff and admin read payments in their tenant" ON public.payments;
DROP POLICY IF EXISTS "payments_select_client" ON public.payments;
DROP POLICY IF EXISTS "payments_select_own_authenticated" ON public.payments;
DROP POLICY IF EXISTS "payments_select_staff_admin" ON public.payments;
DROP POLICY IF EXISTS "super_admin_read_all_payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can update their own payments" ON public.payments;
DROP POLICY IF EXISTS "payments_update_client" ON public.payments;
DROP POLICY IF EXISTS "payments_update_staff_admin" ON public.payments;
DROP POLICY IF EXISTS "super_admin_update_payments" ON public.payments;

-- Step 3: Re-enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Step 4: Apply CLEAN, MINIMAL policies (no duplicates, no recursion)

-- ============ CLIENTS (authenticated users viewing their own payments) ============

CREATE POLICY "clients_read_own_payments" ON public.payments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "clients_update_own_payments" ON public.payments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "clients_delete_own_payments" ON public.payments
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============ STAFF/ADMIN (viewing all payments in their tenant) ============

CREATE POLICY "staff_read_tenant_payments" ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
        AND role IN ('staff', 'admin', 'tenant_admin')
    )
  );

CREATE POLICY "staff_update_tenant_payments" ON public.payments
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
        AND role IN ('staff', 'admin', 'tenant_admin')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
        AND role IN ('staff', 'admin', 'tenant_admin')
    )
  );

CREATE POLICY "staff_delete_tenant_payments" ON public.payments
  FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
        AND role IN ('staff', 'admin', 'tenant_admin')
    )
  );

-- ============ SUPER ADMIN (full access) ============

CREATE POLICY "superadmin_read_all_payments" ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid() 
        AND u.role = 'superadmin'
    )
  );

CREATE POLICY "superadmin_update_all_payments" ON public.payments
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

CREATE POLICY "superadmin_delete_all_payments" ON public.payments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid() 
        AND u.role = 'superadmin'
    )
  );

-- ============ SERVICE ROLE (backend full access) ============

CREATE POLICY "service_role_full_access" ON public.payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

