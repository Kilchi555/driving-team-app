-- Restrict staff_working_hours client writes to the session user or
-- tenant staff/admin. Clients cannot mutate another instructor's hours.
-- Writes already go through /api/staff/working-hours (service role).
-- Do not apply this to production from the remediation agent.

ALTER TABLE public.staff_working_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage their own working hours" ON public.staff_working_hours;
DROP POLICY IF EXISTS "Admins can view all working hours" ON public.staff_working_hours;
DROP POLICY IF EXISTS "Staff can view their own working hours" ON public.staff_working_hours;
DROP POLICY IF EXISTS staff_working_hours_tenant_access ON public.staff_working_hours;

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

CREATE POLICY staff_working_hours_mutate_own
  ON public.staff_working_hours
  FOR ALL
  TO authenticated
  USING (
    staff_id IN (
      SELECT u.id
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('admin', 'staff', 'tenant_admin', 'super_admin')
        AND u.is_active = true
        AND u.deleted_at IS NULL
    )
  )
  WITH CHECK (
    staff_id IN (
      SELECT u.id
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('admin', 'staff', 'tenant_admin', 'super_admin')
        AND u.is_active = true
        AND u.deleted_at IS NULL
    )
    AND tenant_id IN (
      SELECT u.tenant_id
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.is_active = true
        AND u.deleted_at IS NULL
    )
  );

CREATE POLICY staff_working_hours_admin_mutate
  ON public.staff_working_hours
  FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT u.tenant_id
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('admin', 'tenant_admin', 'super_admin')
        AND u.is_active = true
        AND u.deleted_at IS NULL
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT u.tenant_id
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('admin', 'tenant_admin', 'super_admin')
        AND u.is_active = true
        AND u.deleted_at IS NULL
    )
  );
