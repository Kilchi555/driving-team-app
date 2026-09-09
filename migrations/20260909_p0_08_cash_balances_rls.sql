-- P0-08: stop the permissive FOR ALL policy from allowing client JWTs to
-- mutate cash_balances (including current_balance_rappen).
-- Inventory:
--   READ  composables/useOfficeCashRegisters.ts (staff UI SELECT)
--         server/api/admin/cash-management.post.ts (service role)
--         server/api/admin/accounting/{export-archive,cash-close,balance-sheet}
--   WRITE cash-management / cash-operations via service role
--         office_cash_* RPCs (EXECUTE already revoked from authenticated)
-- Do not apply this to production from the remediation agent.

ALTER TABLE public.cash_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cash_balances_tenant_access ON public.cash_balances;
DROP POLICY IF EXISTS "cash_balances_tenant_access" ON public.cash_balances;
DROP POLICY IF EXISTS cash_balances_select_policy ON public.cash_balances;
DROP POLICY IF EXISTS "cash_balances_select_policy" ON public.cash_balances;
DROP POLICY IF EXISTS cash_balances_insert_policy ON public.cash_balances;
DROP POLICY IF EXISTS "cash_balances_insert_policy" ON public.cash_balances;
DROP POLICY IF EXISTS cash_balances_update_policy ON public.cash_balances;
DROP POLICY IF EXISTS "cash_balances_update_policy" ON public.cash_balances;
DROP POLICY IF EXISTS "Admins can view all cash balances" ON public.cash_balances;
DROP POLICY IF EXISTS "Instructors can view own cash balance" ON public.cash_balances;
DROP POLICY IF EXISTS "Only admins can update cash balances" ON public.cash_balances;
DROP POLICY IF EXISTS "Only admins can insert cash balances" ON public.cash_balances;
DROP POLICY IF EXISTS cash_balances_delete_policy ON public.cash_balances;
DROP POLICY IF EXISTS "cash_balances_delete_policy" ON public.cash_balances;

CREATE POLICY cash_balances_staff_select
  ON public.cash_balances
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT u.tenant_id
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('admin', 'staff', 'tenant_admin', 'super_admin')
        AND u.is_active = true
        AND u.deleted_at IS NULL
    )
  );

CREATE POLICY cash_balances_staff_insert
  ON public.cash_balances
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT u.tenant_id
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('admin', 'staff', 'tenant_admin', 'super_admin')
        AND u.is_active = true
        AND u.deleted_at IS NULL
    )
  );

CREATE POLICY cash_balances_staff_update
  ON public.cash_balances
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT u.tenant_id
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('admin', 'staff', 'tenant_admin', 'super_admin')
        AND u.is_active = true
        AND u.deleted_at IS NULL
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT u.tenant_id
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('admin', 'staff', 'tenant_admin', 'super_admin')
        AND u.is_active = true
        AND u.deleted_at IS NULL
    )
  );
