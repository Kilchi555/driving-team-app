-- Fix RLS for internal system tables and change SECURITY DEFINER views to SECURITY INVOKER

-- ===== PART 1: Enable RLS on system tables (deny all by default) =====

-- 1. webhook_logs: Only service_role should access via backend APIs
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY webhook_logs_deny_all ON public.webhook_logs
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- 2. admin_notifications: Only admins of same tenant
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_notifications_select ON public.admin_notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
        AND tenant_id = admin_notifications.tenant_id
        AND role = ANY(ARRAY['admin'::text, 'tenant_admin'::text, 'super_admin'::text])
    )
  );

-- 3. migrations: Internal system table, deny all
ALTER TABLE public.migrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY migrations_deny_all ON public.migrations
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- 4. password_strength_audits: Users see only their own
ALTER TABLE public.password_strength_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY password_strength_audits_own ON public.password_strength_audits
  FOR SELECT
  TO authenticated
  USING (
    user_id = (
      SELECT id FROM public.users
      WHERE auth_user_id = auth.uid()
    )
  );

-- ===== PART 2: Fix SECURITY DEFINER views to SECURITY INVOKER =====

-- 1. course_registrations_with_participant
DROP VIEW IF EXISTS public.course_registrations_with_participant CASCADE;
CREATE VIEW public.course_registrations_with_participant WITH (security_invoker) AS
  SELECT 
    cr.id,
    cr.course_id,
    cr.participant_id,
    u.first_name,
    u.last_name,
    u.email
  FROM course_registrations cr
  JOIN users u ON u.id = cr.participant_id;

-- 2. failed_login_activity
DROP VIEW IF EXISTS public.failed_login_activity CASCADE;
CREATE VIEW public.failed_login_activity WITH (security_invoker) AS
  SELECT 
    id,
    email,
    failed_login_attempts,
    last_failed_login_at,
    account_locked_until,
    account_locked_reason
  FROM public.users
  WHERE failed_login_attempts > 0
    OR account_locked_until IS NOT NULL;

-- 3. mfa_setup_status
DROP VIEW IF EXISTS public.mfa_setup_status CASCADE;
CREATE VIEW public.mfa_setup_status WITH (security_invoker) AS
  SELECT 
    id,
    email,
    mfa_enabled,
    mfa_required,
    mfa_setup_completed_at
  FROM public.users;
