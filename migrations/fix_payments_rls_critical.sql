-- CRITICAL: Fix payments table RLS - Prevent data leaks
-- Issue: Students can see payments from other users
-- Solution: Implement proper user-scoped RLS policies

-- Step 1: Disable RLS temporarily to clean up
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.payments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.payments;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.payments;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.payments;
DROP POLICY IF EXISTS "Service role delete payments" ON public.payments;
DROP POLICY IF EXISTS "Service role insert payments" ON public.payments;
DROP POLICY IF EXISTS "Service role read payments" ON public.payments;
DROP POLICY IF EXISTS "Service role update payments" ON public.payments;
DROP POLICY IF EXISTS "payments_tenant_access" ON public.payments;

-- Step 3: Re-enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Step 4: Create SECURE policies

-- Policy 1: Authenticated users can READ their OWN payments only
CREATE POLICY "Authenticated users can read their own payments" ON public.payments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 2: Authenticated users can UPDATE their OWN payments (payment status changes)
CREATE POLICY "Authenticated users can update their own payments" ON public.payments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy 3: Service role has FULL access (backend operations)
CREATE POLICY "Service role full access to payments" ON public.payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy 4: Super admin has FULL access
CREATE POLICY "Super admin full access to payments" ON public.payments
  FOR ALL
  USING (
    (EXISTS (SELECT 1 FROM public.users 
     WHERE users.auth_user_id = auth.uid() AND users.role = 'superadmin'))
  )
  WITH CHECK (
    (EXISTS (SELECT 1 FROM public.users 
     WHERE users.auth_user_id = auth.uid() AND users.role = 'superadmin'))
  );

-- Policy 5: Staff/Admin can READ payments for their tenant
-- (Note: This uses a subquery but staff/admin are rare, so acceptable)
CREATE POLICY "Staff and admin read payments in their tenant" ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() AND role IN ('staff', 'admin', 'tenant_admin')
    )
  );

-- AUDIT TRAIL
COMMENT ON POLICY "Authenticated users can read their own payments" ON public.payments 
  IS '✅ Users can ONLY see their own payments - prevents data leak';

COMMENT ON POLICY "Service role full access to payments" ON public.payments 
  IS '✅ Backend has full access for system operations';

COMMENT ON POLICY "Super admin full access to payments" ON public.payments 
  IS '✅ Super admin can access all payments across all tenants';

COMMENT ON POLICY "Staff and admin read payments in their tenant" ON public.payments 
  IS '✅ Staff/Admin can view all payments in their tenant for reporting/debugging';

