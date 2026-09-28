-- Course invoice phase 1: schema and guards only.
-- Applying this file adds columns, one binding table, and functions.
-- It does not insert invoices, payments, or registrations.
-- It does not update existing prices, statuses, or invoice links.
-- It does not backfill snapshots or historical bindings.
-- It does not schedule, email, or render anything.
-- Appointment booking_policy switches are not referenced.

-- ---------------------------------------------------------------------------
-- Tenant default timing. Not booking_policy.
-- inherit is not a tenant value. off is the default, so nothing invoices.
-- ---------------------------------------------------------------------------

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS default_invoice_timing_mode text NOT NULL DEFAULT 'off',
  ADD COLUMN IF NOT EXISTS default_invoice_lead_days integer;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenants_default_invoice_timing_mode_chk'
      AND conrelid = 'public.tenants'::regclass
  ) THEN
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_default_invoice_timing_mode_chk
      CHECK (default_invoice_timing_mode IN (
        'off', 'immediate', 'days_before_start', 'on_confirmed'
      ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenants_default_invoice_lead_days_range_chk'
      AND conrelid = 'public.tenants'::regclass
  ) THEN
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_default_invoice_lead_days_range_chk
      CHECK (
        default_invoice_lead_days IS NULL
        OR (default_invoice_lead_days >= 0 AND default_invoice_lead_days <= 365)
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenants_default_invoice_lead_days_required_chk'
      AND conrelid = 'public.tenants'::regclass
  ) THEN
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_default_invoice_lead_days_required_chk
      CHECK (
        default_invoice_timing_mode <> 'days_before_start'
        OR default_invoice_lead_days IS NOT NULL
      );
  END IF;
END $$;

COMMENT ON COLUMN public.tenants.default_invoice_timing_mode IS
  'Tenant default for future course-invoice timing. off, immediate, days_before_start, or on_confirmed. Not an appointment auto_invoice switch.';

COMMENT ON COLUMN public.tenants.default_invoice_lead_days IS
  'Required only when default_invoice_timing_mode is days_before_start. Range 0..365.';

-- ---------------------------------------------------------------------------
-- Course category override. Default inherit, including existing rows.
-- off is an explicit override and does not mean "use the tenant default".
-- ---------------------------------------------------------------------------

ALTER TABLE public.course_categories
  ADD COLUMN IF NOT EXISTS invoice_timing_mode text NOT NULL DEFAULT 'inherit',
  ADD COLUMN IF NOT EXISTS invoice_lead_days integer;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_categories_invoice_timing_mode_chk'
      AND conrelid = 'public.course_categories'::regclass
  ) THEN
    ALTER TABLE public.course_categories
      ADD CONSTRAINT course_categories_invoice_timing_mode_chk
      CHECK (invoice_timing_mode IN (
        'inherit', 'off', 'immediate', 'days_before_start', 'on_confirmed'
      ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_categories_invoice_lead_days_range_chk'
      AND conrelid = 'public.course_categories'::regclass
  ) THEN
    ALTER TABLE public.course_categories
      ADD CONSTRAINT course_categories_invoice_lead_days_range_chk
      CHECK (
        invoice_lead_days IS NULL
        OR (invoice_lead_days >= 0 AND invoice_lead_days <= 365)
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_categories_invoice_lead_days_required_chk'
      AND conrelid = 'public.course_categories'::regclass
  ) THEN
    ALTER TABLE public.course_categories
      ADD CONSTRAINT course_categories_invoice_lead_days_required_chk
      CHECK (
        invoice_timing_mode <> 'days_before_start'
        OR invoice_lead_days IS NOT NULL
      );
  END IF;
END $$;

COMMENT ON COLUMN public.course_categories.invoice_timing_mode IS
  'inherit uses the tenant default. off never auto-invoices, even when the tenant default is immediate.';

-- ---------------------------------------------------------------------------
-- Registration price snapshot. All nullable. No defaults. No backfill.
-- ---------------------------------------------------------------------------

ALTER TABLE public.course_registrations
  ADD COLUMN IF NOT EXISTS agreed_net_rappen integer,
  ADD COLUMN IF NOT EXISTS agreed_vat_rate numeric(5,2),
  ADD COLUMN IF NOT EXISTS agreed_vat_rappen integer,
  ADD COLUMN IF NOT EXISTS agreed_gross_rappen integer,
  ADD COLUMN IF NOT EXISTS discount_rappen integer,
  ADD COLUMN IF NOT EXISTS voucher_rappen integer,
  ADD COLUMN IF NOT EXISTS credit_applied_rappen integer,
  ADD COLUMN IF NOT EXISTS agreed_payment_method text,
  ADD COLUMN IF NOT EXISTS price_snapshot_at timestamptz;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_registrations_agreed_net_nonneg_chk'
      AND conrelid = 'public.course_registrations'::regclass
  ) THEN
    ALTER TABLE public.course_registrations
      ADD CONSTRAINT course_registrations_agreed_net_nonneg_chk
      CHECK (agreed_net_rappen IS NULL OR agreed_net_rappen >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_registrations_agreed_vat_rate_nonneg_chk'
      AND conrelid = 'public.course_registrations'::regclass
  ) THEN
    ALTER TABLE public.course_registrations
      ADD CONSTRAINT course_registrations_agreed_vat_rate_nonneg_chk
      CHECK (agreed_vat_rate IS NULL OR agreed_vat_rate >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_registrations_agreed_vat_nonneg_chk'
      AND conrelid = 'public.course_registrations'::regclass
  ) THEN
    ALTER TABLE public.course_registrations
      ADD CONSTRAINT course_registrations_agreed_vat_nonneg_chk
      CHECK (agreed_vat_rappen IS NULL OR agreed_vat_rappen >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_registrations_agreed_gross_nonneg_chk'
      AND conrelid = 'public.course_registrations'::regclass
  ) THEN
    ALTER TABLE public.course_registrations
      ADD CONSTRAINT course_registrations_agreed_gross_nonneg_chk
      CHECK (agreed_gross_rappen IS NULL OR agreed_gross_rappen >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_registrations_discount_nonneg_chk'
      AND conrelid = 'public.course_registrations'::regclass
  ) THEN
    ALTER TABLE public.course_registrations
      ADD CONSTRAINT course_registrations_discount_nonneg_chk
      CHECK (discount_rappen IS NULL OR discount_rappen >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_registrations_voucher_nonneg_chk'
      AND conrelid = 'public.course_registrations'::regclass
  ) THEN
    ALTER TABLE public.course_registrations
      ADD CONSTRAINT course_registrations_voucher_nonneg_chk
      CHECK (voucher_rappen IS NULL OR voucher_rappen >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_registrations_credit_applied_nonneg_chk'
      AND conrelid = 'public.course_registrations'::regclass
  ) THEN
    ALTER TABLE public.course_registrations
      ADD CONSTRAINT course_registrations_credit_applied_nonneg_chk
      CHECK (credit_applied_rappen IS NULL OR credit_applied_rappen >= 0);
  END IF;
END $$;

-- Full snapshots must match the existing invoice VAT trigger for one registration.
-- Null historical rows stay valid. Credit is not part of gross.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_registrations_price_snapshot_formula_chk'
      AND conrelid = 'public.course_registrations'::regclass
  ) THEN
    ALTER TABLE public.course_registrations
      ADD CONSTRAINT course_registrations_price_snapshot_formula_chk
      CHECK (
        agreed_net_rappen IS NULL
        OR agreed_vat_rate IS NULL
        OR agreed_vat_rappen IS NULL
        OR agreed_gross_rappen IS NULL
        OR discount_rappen IS NULL
        OR voucher_rappen IS NULL
        OR (
          agreed_vat_rappen = round(agreed_net_rappen::numeric * agreed_vat_rate / 100)::integer
          AND agreed_gross_rappen = agreed_net_rappen + agreed_vat_rappen
            - discount_rappen - voucher_rappen
          AND agreed_gross_rappen >= 0
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN public.course_registrations.price_snapshot_at IS
  'NULL until a later phase writes a real snapshot. Phase 1 does not backfill this.';

-- ---------------------------------------------------------------------------
-- One registration, one course-invoice binding.
-- invoice_id on course_registrations stays non-unique: one company invoice
-- can point at many registrations. Historical rows are not bound here.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.course_invoice_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  registration_id uuid NOT NULL REFERENCES public.course_registrations(id) ON DELETE RESTRICT,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT course_invoice_bindings_registration_key UNIQUE (tenant_id, registration_id)
);

CREATE INDEX IF NOT EXISTS idx_course_invoice_bindings_tenant_invoice
  ON public.course_invoice_bindings (tenant_id, invoice_id);

ALTER TABLE public.course_invoice_bindings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.course_invoice_bindings_tenant_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $guard$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_mismatch' USING ERRCODE = 'check_violation';
  END IF;

  PERFORM 1
  FROM public.invoices i
  WHERE i.id = NEW.invoice_id
    AND i.tenant_id = NEW.tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'tenant_mismatch' USING ERRCODE = 'check_violation';
  END IF;

  PERFORM 1
  FROM public.course_registrations cr
  WHERE cr.id = NEW.registration_id
    AND cr.tenant_id = NEW.tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'tenant_mismatch' USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$guard$;

DROP TRIGGER IF EXISTS trg_course_invoice_bindings_tenant
  ON public.course_invoice_bindings;

CREATE TRIGGER trg_course_invoice_bindings_tenant
  BEFORE INSERT OR UPDATE ON public.course_invoice_bindings
  FOR EACH ROW
  EXECUTE FUNCTION public.course_invoice_bindings_tenant_guard();

-- ---------------------------------------------------------------------------
-- Keep the existing payment/SARI freeze. Also freeze invoice_id once set,
-- including for service_role. First NULL -> value remains allowed.
-- Non-service writers cannot set snapshot fields or invoice_id.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.course_registrations_protect_payment_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $protect$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.invoice_id IS NOT NULL
     AND NEW.invoice_id IS DISTINCT FROM OLD.invoice_id THEN
    RAISE EXCEPTION 'invoice_link_frozen' USING ERRCODE = 'check_violation';
  END IF;

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
    NEW.invoice_id := NULL;
    NEW.agreed_net_rappen := NULL;
    NEW.agreed_vat_rate := NULL;
    NEW.agreed_vat_rappen := NULL;
    NEW.agreed_gross_rappen := NULL;
    NEW.discount_rappen := NULL;
    NEW.voucher_rappen := NULL;
    NEW.credit_applied_rappen := NULL;
    NEW.agreed_payment_method := NULL;
    NEW.price_snapshot_at := NULL;
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
  NEW.invoice_id := OLD.invoice_id;
  NEW.agreed_net_rappen := OLD.agreed_net_rappen;
  NEW.agreed_vat_rate := OLD.agreed_vat_rate;
  NEW.agreed_vat_rappen := OLD.agreed_vat_rappen;
  NEW.agreed_gross_rappen := OLD.agreed_gross_rappen;
  NEW.discount_rappen := OLD.discount_rappen;
  NEW.voucher_rappen := OLD.voucher_rappen;
  NEW.credit_applied_rappen := OLD.credit_applied_rappen;
  NEW.agreed_payment_method := OLD.agreed_payment_method;
  NEW.price_snapshot_at := OLD.price_snapshot_at;
  RETURN NEW;
END;
$protect$;

-- ---------------------------------------------------------------------------
-- issue_course_invoice
-- Service role only. One registration. Amounts are read from the snapshot
-- columns, never from arguments.
--
-- Already billed when either link exists:
--   course_registrations.invoice_id
--   payments.invoice_id for that registration
--   course_invoice_bindings
-- In those cases the existing invoice is returned and no second invoice,
-- and no historical binding, is written.
--
-- Rejected payment methods include wallee, cash_on_site, admin, reserved,
-- and any other value that is not invoice. Both payment_method and
-- agreed_payment_method must already be invoice on the row.
--
-- Header totals match calculate_invoice_vat for this one registration:
--   vat = round(subtotal * rate / 100)
--   total = subtotal + vat - discount
-- Credit stays on the snapshot and is not folded into the invoice total.
-- This function does not set a VAT bypass GUC.
-- Status is draft. The current invoice status check is unchanged.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.issue_course_invoice(
  p_tenant_id uuid,
  p_registration_ids uuid[],
  p_actor_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  invoice_id uuid,
  invoice_number text,
  created boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $issue$
DECLARE
  v_id uuid;
  v_reg public.course_registrations%ROWTYPE;
  v_existing uuid;
  v_existing_number text;
  v_link_count integer;
  v_due_days integer;
  v_course_tenant uuid;
  v_course_name text;
  v_expected_vat integer;
  v_expected_gross integer;
  v_discount integer;
  v_new_invoice uuid;
  v_invoice_number text;
  v_student_name text;
BEGIN
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_required' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_registration_ids IS NULL
     OR cardinality(p_registration_ids) <> 1
     OR p_registration_ids[1] IS NULL THEN
    RAISE EXCEPTION 'invalid_registration_ids' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  v_id := p_registration_ids[1];

  PERFORM 1
  FROM public.tenants t
  WHERE t.id = p_tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'tenant_not_found' USING ERRCODE = 'no_data_found';
  END IF;

  IF p_actor_user_id IS NOT NULL THEN
    PERFORM 1
    FROM public.users u
    WHERE u.id = p_actor_user_id
      AND u.tenant_id = p_tenant_id
      AND u.is_active IS TRUE
      AND u.deleted_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'actor_not_found' USING ERRCODE = 'no_data_found';
    END IF;
  END IF;

  SELECT cr.*
    INTO v_reg
  FROM public.course_registrations cr
  WHERE cr.id = v_id
    AND cr.tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'registration_not_found' USING ERRCODE = 'no_data_found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.payments p
    WHERE p.course_registration_id = v_id
      AND p.tenant_id IS DISTINCT FROM p_tenant_id
  ) THEN
    RAISE EXCEPTION 'registration_not_billable' USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(DISTINCT src.invoice_id)::integer
    INTO v_link_count
  FROM (
    SELECT cr.invoice_id
    FROM public.course_registrations cr
    WHERE cr.id = v_id
      AND cr.tenant_id = p_tenant_id
      AND cr.invoice_id IS NOT NULL
    UNION
    SELECT p.invoice_id
    FROM public.payments p
    WHERE p.course_registration_id = v_id
      AND p.tenant_id = p_tenant_id
      AND p.invoice_id IS NOT NULL
    UNION
    SELECT b.invoice_id
    FROM public.course_invoice_bindings b
    WHERE b.registration_id = v_id
      AND b.tenant_id = p_tenant_id
  ) src;

  IF v_link_count > 1 THEN
    RAISE EXCEPTION 'binding_conflict' USING ERRCODE = 'unique_violation';
  END IF;

  IF v_link_count = 1 THEN
    SELECT src.invoice_id
      INTO v_existing
    FROM (
      SELECT cr.invoice_id
      FROM public.course_registrations cr
      WHERE cr.id = v_id
        AND cr.tenant_id = p_tenant_id
        AND cr.invoice_id IS NOT NULL
      UNION
      SELECT p.invoice_id
      FROM public.payments p
      WHERE p.course_registration_id = v_id
        AND p.tenant_id = p_tenant_id
        AND p.invoice_id IS NOT NULL
      UNION
      SELECT b.invoice_id
      FROM public.course_invoice_bindings b
      WHERE b.registration_id = v_id
        AND b.tenant_id = p_tenant_id
    ) src
    LIMIT 1;

    SELECT i.invoice_number::text
      INTO v_existing_number
    FROM public.invoices i
    WHERE i.id = v_existing
      AND i.tenant_id = p_tenant_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'registration_not_billable' USING ERRCODE = 'check_violation';
    END IF;

    RETURN QUERY
    SELECT v_existing, v_existing_number, false;
    RETURN;
  END IF;

  IF v_reg.deleted_at IS NOT NULL
     OR v_reg.status IS NULL
     OR v_reg.status NOT IN ('pending', 'confirmed', 'completed')
     OR v_reg.payment_status = 'paid'
     OR v_reg.user_id IS NULL THEN
    RAISE EXCEPTION 'registration_not_billable' USING ERRCODE = 'check_violation';
  END IF;

  -- wallee, cash_on_site, admin, reserved, and every other non-invoice value.
  IF v_reg.agreed_payment_method IS DISTINCT FROM 'invoice'
     OR v_reg.payment_method IS DISTINCT FROM 'invoice' THEN
    RAISE EXCEPTION 'payment_method_not_invoice' USING ERRCODE = 'check_violation';
  END IF;

  IF v_reg.price_snapshot_at IS NULL
     OR v_reg.agreed_net_rappen IS NULL
     OR v_reg.agreed_vat_rate IS NULL
     OR v_reg.agreed_vat_rappen IS NULL
     OR v_reg.agreed_gross_rappen IS NULL
     OR v_reg.discount_rappen IS NULL
     OR v_reg.voucher_rappen IS NULL
     OR v_reg.credit_applied_rappen IS NULL THEN
    RAISE EXCEPTION 'missing_snapshot' USING ERRCODE = 'check_violation';
  END IF;

  v_expected_vat := round(v_reg.agreed_net_rappen::numeric * v_reg.agreed_vat_rate / 100)::integer;
  v_discount := v_reg.discount_rappen + v_reg.voucher_rappen;
  v_expected_gross := v_reg.agreed_net_rappen + v_expected_vat - v_discount;

  IF v_reg.agreed_net_rappen < 0
     OR v_reg.agreed_vat_rate < 0
     OR v_reg.agreed_vat_rappen < 0
     OR v_reg.agreed_gross_rappen < 0
     OR v_reg.discount_rappen < 0
     OR v_reg.voucher_rappen < 0
     OR v_reg.credit_applied_rappen < 0
     OR v_reg.agreed_vat_rappen <> v_expected_vat
     OR v_reg.agreed_gross_rappen <> v_expected_gross THEN
    RAISE EXCEPTION 'snapshot_inconsistent' USING ERRCODE = 'check_violation';
  END IF;

  PERFORM 1
  FROM public.users u
  WHERE u.id = v_reg.user_id
    AND u.tenant_id = p_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'registration_not_billable' USING ERRCODE = 'check_violation';
  END IF;

  SELECT c.tenant_id, c.name
    INTO v_course_tenant, v_course_name
  FROM public.courses c
  WHERE c.id = v_reg.course_id;

  IF NOT FOUND OR v_course_tenant IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'course_not_found' USING ERRCODE = 'no_data_found';
  END IF;

  SELECT COALESCE(t.invoice_due_days, 30)
    INTO v_due_days
  FROM public.tenants t
  WHERE t.id = p_tenant_id;

  IF v_due_days IS NULL OR v_due_days < 0 THEN
    v_due_days := 30;
  END IF;

  v_student_name := NULLIF(btrim(concat_ws(' ', v_reg.first_name, v_reg.last_name)), '');

  BEGIN
    v_invoice_number := public.allocate_invoice_number(p_tenant_id);
    v_new_invoice := gen_random_uuid();

    INSERT INTO public.invoices (
      id,
      tenant_id,
      user_id,
      staff_id,
      invoice_number,
      invoice_date,
      due_date,
      billing_type,
      billing_contact_person,
      billing_email,
      billing_street,
      billing_zip,
      billing_city,
      billing_country,
      subtotal_rappen,
      vat_rate,
      vat_amount_rappen,
      discount_amount_rappen,
      total_amount_rappen,
      status,
      payment_status,
      payment_method,
      paid_amount_rappen,
      document_kind
    ) VALUES (
      v_new_invoice,
      p_tenant_id,
      v_reg.user_id,
      p_actor_user_id,
      v_invoice_number,
      CURRENT_DATE,
      CURRENT_DATE + v_due_days,
      'individual',
      v_student_name,
      v_reg.email,
      NULLIF(btrim(concat_ws(' ', v_reg.street, v_reg.street_nr)), ''),
      v_reg.zip,
      v_reg.city,
      'CH',
      v_reg.agreed_net_rappen,
      v_reg.agreed_vat_rate,
      v_reg.agreed_vat_rappen,
      v_discount,
      v_reg.agreed_gross_rappen,
      'draft',
      'pending',
      'invoice',
      0,
      'invoice'
    );

    INSERT INTO public.invoice_items (
      invoice_id,
      tenant_id,
      product_name,
      product_description,
      quantity,
      unit_price_rappen,
      total_price_rappen,
      vat_rate,
      vat_amount_rappen,
      sort_order
    ) VALUES (
      v_new_invoice,
      p_tenant_id,
      LEFT(COALESCE(v_course_name, 'Kurs'), 255),
      NULLIF(btrim(concat_ws(' ', 'Teilnehmer:', v_reg.first_name, v_reg.last_name)), 'Teilnehmer:'),
      1,
      v_reg.agreed_net_rappen,
      v_reg.agreed_net_rappen,
      v_reg.agreed_vat_rate,
      v_reg.agreed_vat_rappen,
      0
    );

    INSERT INTO public.course_invoice_bindings (
      tenant_id, registration_id, invoice_id
    ) VALUES (
      p_tenant_id, v_id, v_new_invoice
    );

    RETURN QUERY
    SELECT v_new_invoice, v_invoice_number, true;
    RETURN;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT b.invoice_id, i.invoice_number::text
        INTO v_existing, v_existing_number
      FROM public.course_invoice_bindings b
      JOIN public.invoices i
        ON i.id = b.invoice_id
       AND i.tenant_id = p_tenant_id
      WHERE b.tenant_id = p_tenant_id
        AND b.registration_id = v_id;

      IF NOT FOUND THEN
        RAISE;
      END IF;

      RETURN QUERY
      SELECT v_existing, v_existing_number, false;
      RETURN;
  END;
END;
$issue$;

COMMENT ON FUNCTION public.issue_course_invoice(uuid, uuid[], uuid) IS
  'Issue one draft course invoice from an existing invoice snapshot, or return the invoice already linked by registration.invoice_id, payments.invoice_id, or course_invoice_bindings. Does not email, render, or relink historical rows. service_role only.';

REVOKE ALL ON FUNCTION public.issue_course_invoice(uuid, uuid[], uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.issue_course_invoice(uuid, uuid[], uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_course_invoice(uuid, uuid[], uuid) TO service_role;

REVOKE ALL ON FUNCTION public.course_invoice_bindings_tenant_guard() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.course_invoice_bindings_tenant_guard() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.course_invoice_bindings_tenant_guard() TO service_role;

REVOKE ALL ON TABLE public.course_invoice_bindings FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.course_invoice_bindings TO service_role;
