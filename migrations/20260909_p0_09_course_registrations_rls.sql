-- P0-09: clients must not mutate foreign course_registrations or insert
-- into an arbitrary tenant. Guest enrollment stays on the server API
-- (service role) rather than a broad authenticated ALL/INSERT policy.
-- Do not apply this to production from the remediation agent.

ALTER TABLE public.course_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS course_registrations_tenant_access ON public.course_registrations;
DROP POLICY IF EXISTS "course_registrations_tenant_access" ON public.course_registrations;
DROP POLICY IF EXISTS "Allow authenticated users to insert course registrations" ON public.course_registrations;
DROP POLICY IF EXISTS "Admins can manage all course registrations" ON public.course_registrations;
DROP POLICY IF EXISTS "Users can view their own active course registrations" ON public.course_registrations;
DROP POLICY IF EXISTS "Users can view their own course registrations" ON public.course_registrations;
DROP POLICY IF EXISTS "Users can insert own registrations" ON public.course_registrations;
DROP POLICY IF EXISTS "Users can view their own registrations" ON public.course_registrations;

CREATE POLICY course_registrations_select_own
  ON public.course_registrations
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND user_id IN (
      SELECT u.id
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.is_active = true
        AND u.deleted_at IS NULL
    )
  );

CREATE POLICY course_registrations_staff_select
  ON public.course_registrations
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

-- Staff UI (useCourseParticipants) inserts via the user JWT. Clients cannot.
CREATE POLICY course_registrations_staff_insert
  ON public.course_registrations
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

CREATE POLICY course_registrations_staff_update
  ON public.course_registrations
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

CREATE POLICY course_registrations_staff_delete
  ON public.course_registrations
  FOR DELETE
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
