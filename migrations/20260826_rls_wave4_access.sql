-- Wave 4: tenant-scoped product_sales + users staff SELECT, revoke leftover DEFINER RPCs.
-- Server APIs use service_role and are unaffected. Guest anonymous-sale reads go through
-- /api/anonymous-sale/:id (no anon table SELECT).

-- ---------------------------------------------------------------------------
-- 1) Helper: privileged tenant reader (avoids users-policy recursion)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_read_tenant_users(check_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
  user_tenant_id uuid;
BEGIN
  SELECT role, tenant_id
  INTO user_role, user_tenant_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
    AND is_active = true
  LIMIT 1;

  IF user_role = 'super_admin' THEN
    RETURN true;
  END IF;

  IF user_role IN ('admin', 'staff', 'tenant_admin')
     AND user_tenant_id IS NOT NULL
     AND user_tenant_id = check_tenant_id THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.can_read_tenant_users(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_tenant_users(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) users: drop global staff PII SELECT; staff/admin see same-tenant rows
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS anon_read_staff_users ON public.users;

DROP POLICY IF EXISTS users_tenant_staff_select ON public.users;
CREATE POLICY users_tenant_staff_select ON public.users
  FOR SELECT TO authenticated
  USING (public.can_read_tenant_users(tenant_id));

-- ---------------------------------------------------------------------------
-- 3) product_sales: drop cross-tenant Enable-*; staff/admin tenant ALL
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_product_sales_tenant_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT tenant_id
    INTO NEW.tenant_id
    FROM public.users
    WHERE auth_user_id = auth.uid()
      AND is_active = true
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_product_sales_tenant_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_product_sales_tenant_id() TO service_role;

DROP TRIGGER IF EXISTS product_sales_set_tenant_id ON public.product_sales;
CREATE TRIGGER product_sales_set_tenant_id
  BEFORE INSERT ON public.product_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.set_product_sales_tenant_id();

UPDATE public.product_sales ps
SET tenant_id = u.tenant_id
FROM public.users u
WHERE ps.tenant_id IS NULL
  AND ps.staff_id IS NOT NULL
  AND u.id = ps.staff_id
  AND u.tenant_id IS NOT NULL;

UPDATE public.product_sales ps
SET tenant_id = u.tenant_id
FROM public.users u
WHERE ps.tenant_id IS NULL
  AND ps.user_id IS NOT NULL
  AND u.id = ps.user_id
  AND u.tenant_id IS NOT NULL;

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.product_sales;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.product_sales;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.product_sales;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.product_sales;
DROP POLICY IF EXISTS product_sales_tenant_access ON public.product_sales;
DROP POLICY IF EXISTS product_sales_staff_tenant_all ON public.product_sales;

CREATE POLICY product_sales_staff_tenant_all ON public.product_sales
  FOR ALL TO authenticated
  USING (public.can_read_tenant_users(tenant_id))
  WITH CHECK (public.can_read_tenant_users(tenant_id));

REVOKE ALL ON TABLE public.product_sales FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_sales TO authenticated;
GRANT ALL ON TABLE public.product_sales TO service_role;

-- ---------------------------------------------------------------------------
-- 4) Server-only DEFINER RPCs: no anon/authenticated EXECUTE
--    KEEP: policy helpers, log_sms_link_click (simy /fl uses anon key)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname = ANY (ARRAY[
        'book_payment_to_accounting',
        'calculate_cash_balance',
        'check_login_security_status',
        'check_user_tenant_consistency',
        'confirm_cash_transaction',
        'create_cash_transaction_from_payment',
        'create_staff_cash_register',
        'create_student_credit',
        'expire_old_instructor_invitations',
        'expire_old_staff_invitations',
        'get_office_cash_balance',
        'get_user_info',
        'get_user_role',
        'get_user_tenant_slug',
        'get_user_tenant_strict',
        'increment_campaign_click',
        'increment_campaign_click_b',
        'increment_campaign_conversion',
        'increment_campaign_conversion_b',
        'increment_campaign_open',
        'increment_campaign_open_b',
        'log_payment_changes',
        'log_user_management_action',
        'marketing_campaign_queue_stats',
        'recount_course_participants',
        'trg_courses_force_live_participant_count',
        'trg_recount_course_participants',
        'trigger_cash_withdrawal',
        'trigger_update_cash_balance',
        'trigger_update_cash_balance_from_movements',
        'update_cash_balance',
        'validate_discount_code',
        'validate_user_tenant_login',
        'verify_tenant_session'
      ])
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
      r.nspname, r.proname, r.args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role',
      r.nspname, r.proname, r.args
    );
  END LOOP;
END $$;
