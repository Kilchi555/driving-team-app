-- F-05a / F-05b — close live RLS holes on payments UPDATE and reminder_logs SELECT/INSERT
-- Scope: ONLY these two findings. No destructive data changes.
--
-- F-05a: Drop customer_update_own so clients cannot mutate payment_status / tenant_id / ownership.
--         Staff/admin/tenant_admin + service_role + super_admin policies remain.
-- F-05b: Replace open authenticated SELECT/INSERT on reminder_logs with tenant-scoped staff SELECT.
--         Writes go through service_role (server APIs / edge functions). Clients no longer INSERT.

BEGIN;

-- ---------------------------------------------------------------------------
-- F-05a — payments: revoke customer UPDATE
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "customer_update_own" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can update their own payments" ON public.payments;
DROP POLICY IF EXISTS "payments_update_own" ON public.payments;
DROP POLICY IF EXISTS "payments_update_client" ON public.payments;

COMMENT ON TABLE public.payments IS
  'F-05a (2026-09-02): clients must not UPDATE payments via Data API; status changes via service_role/webhooks/staff only.';

-- ---------------------------------------------------------------------------
-- F-05b — reminder_logs: replace open policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.reminder_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.reminder_logs;
DROP POLICY IF EXISTS "reminder_logs_select_authenticated" ON public.reminder_logs;
DROP POLICY IF EXISTS "reminder_logs_insert_authenticated" ON public.reminder_logs;

ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

-- Staff / admin / tenant_admin: read only own tenant (requires tenant_id populated on insert)
CREATE POLICY "reminder_logs_staff_select_tenant"
  ON public.reminder_logs
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND tenant_id IN (
      SELECT u.tenant_id
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = ANY (ARRAY['staff'::text, 'admin'::text, 'tenant_admin'::text])
        AND COALESCE(u.is_active, true) = true
        AND u.tenant_id IS NOT NULL
    )
  );

-- Platform super_admin (canonical role name in users.role)
CREATE POLICY "reminder_logs_super_admin_select_all"
  ON public.reminder_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'super_admin'
        AND COALESCE(u.is_active, true) = true
    )
  );

-- Explicit service_role full access (service_role bypasses RLS; policy documents intent)
DROP POLICY IF EXISTS "reminder_logs_service_role_all" ON public.reminder_logs;
CREATE POLICY "reminder_logs_service_role_all"
  ON public.reminder_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No authenticated INSERT/UPDATE/DELETE policies — clients cannot write reminder_logs.
-- Server routes (service_role) and edge functions perform writes.

COMMENT ON TABLE public.reminder_logs IS
  'F-05b (2026-09-02): tenant-scoped staff SELECT; writes via service_role only. Open authenticated SELECT/INSERT removed.';

COMMIT;
