-- P0-08: cash_balances financial writes are server-side only.
-- Live production policies (unyjaetebnaexaflpyoc, verified 2026-09-09):
--   cash_balances_tenant_access     FOR ALL  (any active tenant user)
--   cash_balances_select_policy     SELECT   (any active tenant user)
--   cash_balances_insert_policy     INSERT   (staff/admin)
--   cash_balances_update_policy     UPDATE   (staff/admin)
-- Inventory:
--   READ  composables/useOfficeCashRegisters.ts (staff UI SELECT)
--         server/api/admin/cash-management.post.ts (service role)
--         server/api/admin/accounting/{export-archive,cash-close,balance-sheet}
--   WRITE cash-management / cash-operations via service role
--         office_cash_* RPCs (EXECUTE already revoked from authenticated)
-- Do not apply this to production from the remediation agent.
-- Rollback: restore the four live policies above; re-GRANT INSERT/UPDATE/DELETE
-- to authenticated. Existing rows are not rewritten by this migration.

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
DROP POLICY IF EXISTS cash_balances_staff_select ON public.cash_balances;
DROP POLICY IF EXISTS cash_balances_staff_insert ON public.cash_balances;
DROP POLICY IF EXISTS cash_balances_staff_update ON public.cash_balances;

-- Staff/admin may read tenant balances in the office UI. Clients and anon cannot.
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

-- Defense in depth: JWT roles cannot write rows even if a policy is added later.
-- service_role keeps its direct GRANT ALL (not granted via PUBLIC).
REVOKE INSERT, UPDATE, DELETE ON TABLE public.cash_balances FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.cash_balances FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.cash_balances FROM authenticated;
REVOKE SELECT ON TABLE public.cash_balances FROM anon;
GRANT SELECT ON TABLE public.cash_balances TO authenticated;
