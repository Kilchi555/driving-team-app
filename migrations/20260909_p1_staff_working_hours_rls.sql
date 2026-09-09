-- Restrict staff_working_hours client writes to the session user or
-- tenant admin, with WITH CHECK that the target staff belongs to the
-- same tenant. Clients cannot mutate another instructor's hours.
--
-- Live production policies (unyjaetebnaexaflpyoc, verified 2026-09-09):
--   staff_working_hours_tenant_isolation  FOR ALL
--     USING/WITH CHECK (tenant_id = session tenant) — ANY authenticated
--     tenant user including clients can mutate every instructor's hours
--   "Staff can manage their own working hours"  FOR ALL
--   "Admins can view all working hours"  SELECT (unscoped admin role)
--   "anon_read_staff_working_hours"  SELECT USING (true)
--     Public booking reads hours via service-role APIs
--     (booking/get-availability, booking-slot-probe), not anon JWT.
--     Anonymous SELECT is not a product requirement and is dropped.
--
-- Product writes:
--   /api/staff/working-hours and /api/staff/working-hours-manage (service role
--     AFTER requireTenantStaff + loadStaffInTenant + assertSelfOrTenantAdmin)
--   /api/database/query DELETE (StaffSettings clear-all) uses the user JWT
--     after the same ownership check — RLS applies
--   staff/register and tenants/create-admin insert hours for the new user
--     via service role after invitation/registration-token auth
-- Do not apply this to production from the remediation agent.
-- Rollback: restore the four live policies above.

ALTER TABLE public.staff_working_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage their own working hours" ON public.staff_working_hours;
DROP POLICY IF EXISTS "Admins can view all working hours" ON public.staff_working_hours;
DROP POLICY IF EXISTS "Staff can view their own working hours" ON public.staff_working_hours;
DROP POLICY IF EXISTS staff_working_hours_tenant_access ON public.staff_working_hours;
DROP POLICY IF EXISTS staff_working_hours_tenant_isolation ON public.staff_working_hours;
DROP POLICY IF EXISTS anon_read_staff_working_hours ON public.staff_working_hours;
DROP POLICY IF EXISTS "anon_read_staff_working_hours" ON public.staff_working_hours;
DROP POLICY IF EXISTS staff_working_hours_select ON public.staff_working_hours;
DROP POLICY IF EXISTS staff_working_hours_mutate_own ON public.staff_working_hours;
DROP POLICY IF EXISTS staff_working_hours_admin_mutate ON public.staff_working_hours;
DROP POLICY IF EXISTS staff_working_hours_insert ON public.staff_working_hours;
DROP POLICY IF EXISTS staff_working_hours_update ON public.staff_working_hours;
DROP POLICY IF EXISTS staff_working_hours_delete ON public.staff_working_hours;

CREATE POLICY staff_working_hours_select
  ON public.staff_working_hours
  FOR SELECT
  TO authenticated
  USING (
    staff_id IN (
      SELECT u.id
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.is_active = true
        AND u.deleted_at IS NULL
    )
    OR tenant_id IN (
      SELECT u.tenant_id
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('admin', 'tenant_admin', 'super_admin')
        AND u.is_active = true
        AND u.deleted_at IS NULL
    )
  );

-- INSERT: own row (staff/admin) or any same-tenant staff row (tenant admin).
CREATE POLICY staff_working_hours_insert
  ON public.staff_working_hours
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users actor
      JOIN public.users target ON target.id = staff_working_hours.staff_id
      WHERE actor.auth_user_id = auth.uid()
        AND actor.is_active = true
        AND actor.deleted_at IS NULL
        AND target.deleted_at IS NULL
        AND actor.tenant_id = staff_working_hours.tenant_id
        AND target.tenant_id = staff_working_hours.tenant_id
        AND (
          (
            actor.id = staff_working_hours.staff_id
            AND actor.role IN ('admin', 'staff', 'tenant_admin', 'super_admin')
          )
          OR actor.role IN ('admin', 'tenant_admin', 'super_admin')
        )
    )
  );

CREATE POLICY staff_working_hours_update
  ON public.staff_working_hours
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users actor
      JOIN public.users target ON target.id = staff_working_hours.staff_id
      WHERE actor.auth_user_id = auth.uid()
        AND actor.is_active = true
        AND actor.deleted_at IS NULL
        AND target.tenant_id = actor.tenant_id
        AND staff_working_hours.tenant_id = actor.tenant_id
        AND (
          (
            actor.id = staff_working_hours.staff_id
            AND actor.role IN ('admin', 'staff', 'tenant_admin', 'super_admin')
          )
          OR actor.role IN ('admin', 'tenant_admin', 'super_admin')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users actor
      JOIN public.users target ON target.id = staff_working_hours.staff_id
      WHERE actor.auth_user_id = auth.uid()
        AND actor.is_active = true
        AND actor.deleted_at IS NULL
        AND target.deleted_at IS NULL
        AND actor.tenant_id = staff_working_hours.tenant_id
        AND target.tenant_id = staff_working_hours.tenant_id
        AND (
          (
            actor.id = staff_working_hours.staff_id
            AND actor.role IN ('admin', 'staff', 'tenant_admin', 'super_admin')
          )
          OR actor.role IN ('admin', 'tenant_admin', 'super_admin')
        )
    )
  );

CREATE POLICY staff_working_hours_delete
  ON public.staff_working_hours
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users actor
      JOIN public.users target ON target.id = staff_working_hours.staff_id
      WHERE actor.auth_user_id = auth.uid()
        AND actor.is_active = true
        AND actor.deleted_at IS NULL
        AND target.tenant_id = actor.tenant_id
        AND staff_working_hours.tenant_id = actor.tenant_id
        AND (
          (
            actor.id = staff_working_hours.staff_id
            AND actor.role IN ('admin', 'staff', 'tenant_admin', 'super_admin')
          )
          OR actor.role IN ('admin', 'tenant_admin', 'super_admin')
        )
    )
  );

REVOKE ALL ON TABLE public.staff_working_hours FROM anon;
