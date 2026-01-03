-- migrations/fix_discount_sales_rls.sql
-- Secure RLS on discount_sales table
-- Note: Staff/Admin access to discount_sales should use backend API (service_role)
-- to avoid RLS recursion and complexity issues

-- Enable RLS on discount_sales table
ALTER TABLE public.discount_sales ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated users can read their own discount sales
-- (via their own appointments)
CREATE POLICY "Authenticated users can read their own discount sales" ON public.discount_sales
  FOR SELECT
  TO authenticated
  USING (
    (EXISTS ( SELECT 1 FROM public.appointments WHERE (appointments.id = discount_sales.appointment_id) AND (appointments.user_id = auth.uid())))
  );

-- Policy 2: Authenticated users can update their own discount sales
CREATE POLICY "Authenticated users can update their own discount sales" ON public.discount_sales
  FOR UPDATE
  TO authenticated
  USING (
    (EXISTS ( SELECT 1 FROM public.appointments WHERE (appointments.id = discount_sales.appointment_id) AND (appointments.user_id = auth.uid())))
  )
  WITH CHECK (
    (EXISTS ( SELECT 1 FROM public.appointments WHERE (appointments.id = discount_sales.appointment_id) AND (appointments.user_id = auth.uid())))
  );

-- Policy 3: Service role has full access (read, insert, update, delete)
CREATE POLICY "Service role full access to discount_sales" ON public.discount_sales
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy 4: Super admin has full access (read, insert, update, delete)
CREATE POLICY "Super admin full access to discount_sales" ON public.discount_sales
  FOR ALL
  USING (
    (EXISTS ( SELECT 1 FROM public.users WHERE (users.auth_user_id = auth.uid()) AND (users.role = 'superadmin')))
  )
  WITH CHECK (
    (EXISTS ( SELECT 1 FROM public.users WHERE (users.auth_user_id = auth.uid()) AND (users.role = 'superadmin')))
  );

