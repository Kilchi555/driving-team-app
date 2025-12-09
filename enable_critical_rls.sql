-- CRITICAL: Enable RLS on all sensitive tables before going live!
-- This prevents unauthorized access to appointments, payments, and customer data

-- 1. Enable RLS on appointments table
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Authenticated users can read appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can update appointments" ON public.appointments;

-- Create RLS policies for appointments
-- Only authenticated users from the same tenant can read
CREATE POLICY "appointments_select_policy" ON public.appointments
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() AND is_active = true
    )
  );

-- Only staff/admin can create appointments
CREATE POLICY "appointments_insert_policy" ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'staff', 'tenant_admin')
      AND is_active = true
    )
  );

-- Only staff/admin can update appointments
CREATE POLICY "appointments_update_policy" ON public.appointments
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'staff', 'tenant_admin')
      AND is_active = true
    )
  );

-- 2. Enable RLS on cash_balances table (VERY CRITICAL!)
ALTER TABLE public.cash_balances ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can read cash_balances" ON public.cash_balances;
DROP POLICY IF EXISTS "Authenticated users can create cash_balances" ON public.cash_balances;
DROP POLICY IF EXISTS "Authenticated users can update cash_balances" ON public.cash_balances;

-- Create RLS policies for cash_balances
CREATE POLICY "cash_balances_select_policy" ON public.cash_balances
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "cash_balances_insert_policy" ON public.cash_balances
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'staff', 'tenant_admin')
      AND is_active = true
    )
  );

CREATE POLICY "cash_balances_update_policy" ON public.cash_balances
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'staff', 'tenant_admin')
      AND is_active = true
    )
  );

-- 3. Enable RLS on company_billing_addresses table
ALTER TABLE public.company_billing_addresses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can read billing_addresses" ON public.company_billing_addresses;
DROP POLICY IF EXISTS "Authenticated users can create billing_addresses" ON public.company_billing_addresses;
DROP POLICY IF EXISTS "Authenticated users can update billing_addresses" ON public.company_billing_addresses;

-- Create RLS policies
CREATE POLICY "billing_addresses_select_policy" ON public.company_billing_addresses
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'staff', 'tenant_admin')
      AND is_active = true
    )
  );

CREATE POLICY "billing_addresses_insert_policy" ON public.company_billing_addresses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'staff', 'tenant_admin')
      AND is_active = true
    )
  );

CREATE POLICY "billing_addresses_update_policy" ON public.company_billing_addresses
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'staff', 'tenant_admin')
      AND is_active = true
    )
  );

-- 4. Enable RLS on discount_codes table
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can read discount_codes" ON public.discount_codes;
DROP POLICY IF EXISTS "Authenticated users can create discount_codes" ON public.discount_codes;
DROP POLICY IF EXISTS "Authenticated users can update discount_codes" ON public.discount_codes;

-- Create RLS policies
CREATE POLICY "discount_codes_select_policy" ON public.discount_codes
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "discount_codes_insert_policy" ON public.discount_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'tenant_admin')
      AND is_active = true
    )
  );

CREATE POLICY "discount_codes_update_policy" ON public.discount_codes
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'tenant_admin')
      AND is_active = true
    )
  );

-- 5. Enable RLS on tenant_settings table
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can read tenant_settings" ON public.tenant_settings;
DROP POLICY IF EXISTS "Authenticated users can create tenant_settings" ON public.tenant_settings;
DROP POLICY IF EXISTS "Authenticated users can update tenant_settings" ON public.tenant_settings;

-- Create RLS policies
CREATE POLICY "tenant_settings_select_policy" ON public.tenant_settings
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "tenant_settings_insert_policy" ON public.tenant_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'tenant_admin')
      AND is_active = true
    )
  );

CREATE POLICY "tenant_settings_update_policy" ON public.tenant_settings
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'tenant_admin')
      AND is_active = true
    )
  );

-- Verify RLS is now enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('appointments', 'cash_balances', 'company_billing_addresses', 'discount_codes', 'tenant_settings')
ORDER BY tablename;

