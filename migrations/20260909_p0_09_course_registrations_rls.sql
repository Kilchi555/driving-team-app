-- P0-09: course_registrations tenant isolation + payment/SARI fields server-only.
-- Live production policies (unyjaetebnaexaflpyoc, verified 2026-09-09):
--   "Allow authenticated users to insert course registrations"
--     INSERT WITH CHECK (auth.role() = 'authenticated' AND deleted_at IS NULL)
--     — unscoped; any auth user can insert any tenant_id and payment fields
--   "course_registrations_tenant_access"  FOR ALL (any active tenant user)
--   "Admins can manage all course registrations"  FOR ALL
--   "Users can view their own active course registrations"  SELECT
--   "Users can view registrations via participant"  SELECT (staff roles)
-- Write inventory:
--   Staff JWT (useCourseParticipants): INSERT roster (name/email/status),
--     UPDATE status='cancelled'. Does not set payment/SARI columns.
--   Guest enrollment / Wallee / SARI / admin APIs: service role.
-- Protected columns (JWT cannot set or change):
--   payment_status, payment_id, amount_paid_rappen, payment_method,
--   discount_applied_rappen, sari_data, sari_synced, sari_synced_at,
--   sari_faberid, sari_license_id, sari_licenses
-- Not protected:
--   sari_synced_by — column does not exist in production.
--   Roster identity fields (name, email, phone, status, notes, user_id)
--     remain staff-writable inside the session tenant.
-- payment_method / discount / sari_faberid are frozen because every legitimate
-- writer of those columns is a service-role API (enroll-cash, enroll-wallee,
-- wallee webhook, admin-course-enroll, SARI sync). JWT roster never sets them.
-- Injecting them via JWT would fake a paid / SARI-enrolled registration.
-- Do not apply this to production from the remediation agent.
-- Rollback: drop the trigger/function; restore the five live policies above.

ALTER TABLE public.course_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS course_registrations_tenant_access ON public.course_registrations;
DROP POLICY IF EXISTS "course_registrations_tenant_access" ON public.course_registrations;
DROP POLICY IF EXISTS "Allow authenticated users to insert course registrations" ON public.course_registrations;
DROP POLICY IF EXISTS "Admins can manage all course registrations" ON public.course_registrations;
DROP POLICY IF EXISTS "Users can view their own active course registrations" ON public.course_registrations;
DROP POLICY IF EXISTS "Users can view their own course registrations" ON public.course_registrations;
DROP POLICY IF EXISTS "Users can insert own registrations" ON public.course_registrations;
DROP POLICY IF EXISTS "Users can view their own registrations" ON public.course_registrations;
DROP POLICY IF EXISTS "Users can view registrations via participant" ON public.course_registrations;
DROP POLICY IF EXISTS course_registrations_select_own ON public.course_registrations;
DROP POLICY IF EXISTS course_registrations_staff_select ON public.course_registrations;
DROP POLICY IF EXISTS course_registrations_staff_insert ON public.course_registrations;
DROP POLICY IF EXISTS course_registrations_staff_update ON public.course_registrations;
DROP POLICY IF EXISTS course_registrations_staff_delete ON public.course_registrations;

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

-- JWT cannot change payment / SARI payload fields. Service role still can
-- (auth.role() is schema-qualified). Triggers fire for service_role too.
CREATE OR REPLACE FUNCTION public.course_registrations_protect_payment_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO pg_catalog, public
AS $$
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.payment_status := 'pending';
    NEW.payment_id := NULL;
    NEW.amount_paid_rappen := 0;
    NEW.payment_method := NULL;
    NEW.discount_applied_rappen := 0;
    NEW.sari_data := NULL;
    NEW.sari_synced := FALSE;
    NEW.sari_synced_at := NULL;
    NEW.sari_faberid := NULL;
    NEW.sari_license_id := NULL;
    NEW.sari_licenses := NULL;
    RETURN NEW;
  END IF;

  NEW.payment_status := OLD.payment_status;
  NEW.payment_id := OLD.payment_id;
  NEW.amount_paid_rappen := OLD.amount_paid_rappen;
  NEW.payment_method := OLD.payment_method;
  NEW.discount_applied_rappen := OLD.discount_applied_rappen;
  NEW.sari_data := OLD.sari_data;
  NEW.sari_synced := OLD.sari_synced;
  NEW.sari_synced_at := OLD.sari_synced_at;
  NEW.sari_faberid := OLD.sari_faberid;
  NEW.sari_license_id := OLD.sari_license_id;
  NEW.sari_licenses := OLD.sari_licenses;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_course_registrations_protect_payment_fields
  ON public.course_registrations;

CREATE TRIGGER trg_course_registrations_protect_payment_fields
  BEFORE INSERT OR UPDATE ON public.course_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.course_registrations_protect_payment_fields();
