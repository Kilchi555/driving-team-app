-- Fix critical RLS policies for sensitive payment data tables

-- ===== 1. customer_payment_methods: Only owner + service_role =====
-- Drop old overly permissive policy
DROP POLICY IF EXISTS "Service role can manage all payment methods" ON public.customer_payment_methods;

-- Enable RLS if not already enabled
ALTER TABLE public.customer_payment_methods ENABLE ROW LEVEL SECURITY;

-- Users see their own payment methods
CREATE POLICY customer_payment_methods_select_own ON public.customer_payment_methods
  FOR SELECT
  TO authenticated
  USING (
    user_id = (
      SELECT id FROM public.users
      WHERE auth_user_id = auth.uid()
    )
  );

-- Users can insert their own payment methods (via API)
CREATE POLICY customer_payment_methods_insert_own ON public.customer_payment_methods
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (
      SELECT id FROM public.users
      WHERE auth_user_id = auth.uid()
    )
  );

-- Users can update their own payment methods
CREATE POLICY customer_payment_methods_update_own ON public.customer_payment_methods
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (
      SELECT id FROM public.users
      WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = (
      SELECT id FROM public.users
      WHERE auth_user_id = auth.uid()
    )
  );

-- Users can delete their own payment methods
CREATE POLICY customer_payment_methods_delete_own ON public.customer_payment_methods
  FOR DELETE
  TO authenticated
  USING (
    user_id = (
      SELECT id FROM public.users
      WHERE auth_user_id = auth.uid()
    )
  );

-- ===== 2. payment_audit_logs: Only super_admin can view (already correct with existing policy) =====
-- No changes needed - already has correct "Allow super_admin read audit logs" policy

-- ===== 3. payment_wallee_transactions: Only super_admin can view (already correct) =====
-- No changes needed - already has correct "super_admin_read_payment_wallee_transactions" policy
