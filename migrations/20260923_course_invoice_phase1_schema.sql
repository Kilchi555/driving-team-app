-- Course invoice phase 1: schema, constraints, RLS, grants, and issue_course_invoice.
-- AUTOMATION STAYS OFF. This file does not insert invoices, send email, write
-- snapshots onto existing registrations, or enable any category policy.
--
-- Existing course_categories rows receive the defaults below and nothing else:
--   invoice_timing_mode = off
--   company_invoicing_mode = manual
--   late_registration_policy = manual
--
-- agreed_currency DEFAULT 'CHF' is a currency constraint, not a price snapshot.
-- price_snapshot_at is left NULL on every existing registration. No prices are
-- copied from courses or from amount_paid_rappen.
--
-- open_amount_rappen / qr_amount_rappen DEFAULT 0 lets ADD COLUMN succeed.
-- That default is not a recalculation of historical invoice totals or statuses.
--
-- attempt_no convention (no retry worker in this phase):
--   1 = first delivery attempt
--   2, 3, 4 = the three automatic retries
--   CHECK keeps attempt_no in 1..4
--
-- days_before_start is unusable until invoice_lead_days is set (0..365).
-- The CHECK below enforces that. Phase 2 must not weaken it.
--
-- Confirmed payments, when the function runs, are payments rows for the same
-- tenant and course_registration_id whose payment_status is paid or completed,
-- net of refunded_amount_rappen. No parallel payment table is introduced.

-- ---------------------------------------------------------------------------
-- course_registrations price / payment snapshot
-- ---------------------------------------------------------------------------

ALTER TABLE public.course_registrations
  ADD COLUMN IF NOT EXISTS agreed_currency text NOT NULL DEFAULT 'CHF',
  ADD COLUMN IF NOT EXISTS price_source text,
  ADD COLUMN IF NOT EXISTS price_source_ref uuid,
  ADD COLUMN IF NOT EXISTS agreed_net_rappen integer,
  ADD COLUMN IF NOT EXISTS discount_rappen integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voucher_rappen integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voucher_code_id uuid,
  ADD COLUMN IF NOT EXISTS voucher_label text,
  ADD COLUMN IF NOT EXISTS agreed_vat_rate numeric(5,2),
  ADD COLUMN IF NOT EXISTS agreed_vat_rappen integer,
  ADD COLUMN IF NOT EXISTS agreed_gross_rappen integer,
  ADD COLUMN IF NOT EXISTS credit_applied_rappen integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agreed_payment_method text,
  ADD COLUMN IF NOT EXISTS price_snapshot_at timestamptz,
  ADD COLUMN IF NOT EXISTS price_confirmed_by uuid,
  ADD COLUMN IF NOT EXISTS snapshot_formula text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_registrations_agreed_currency_chk'
      AND conrelid = 'public.course_registrations'::regclass
  ) THEN
    ALTER TABLE public.course_registrations
      ADD CONSTRAINT course_registrations_agreed_currency_chk
      CHECK (agreed_currency = 'CHF');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_registrations_price_source_chk'
      AND conrelid = 'public.course_registrations'::regclass
  ) THEN
    ALTER TABLE public.course_registrations
      ADD CONSTRAINT course_registrations_price_source_chk
      CHECK (price_source IS NULL OR price_source IN ('full', 'partial', 'session'));
  END IF;
END $$;

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
    WHERE conname = 'course_registrations_discount_nonneg_chk'
      AND conrelid = 'public.course_registrations'::regclass
  ) THEN
    ALTER TABLE public.course_registrations
      ADD CONSTRAINT course_registrations_discount_nonneg_chk
      CHECK (discount_rappen >= 0);
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
      CHECK (voucher_rappen >= 0);
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
    WHERE conname = 'course_registrations_credit_applied_nonneg_chk'
      AND conrelid = 'public.course_registrations'::regclass
  ) THEN
    ALTER TABLE public.course_registrations
      ADD CONSTRAINT course_registrations_credit_applied_nonneg_chk
      CHECK (credit_applied_rappen >= 0);
  END IF;
END $$;

-- Full snapshots must match course_invoice_v1. Partial/null historical rows stay valid.
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
        OR (
          agreed_vat_rappen = round(agreed_net_rappen::numeric * agreed_vat_rate / 100)::integer
          AND agreed_gross_rappen = agreed_net_rappen + agreed_vat_rappen - discount_rappen - voucher_rappen
          AND agreed_gross_rappen >= 0
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_registrations_voucher_code_id_fkey'
      AND conrelid = 'public.course_registrations'::regclass
  ) THEN
    ALTER TABLE public.course_registrations
      ADD CONSTRAINT course_registrations_voucher_code_id_fkey
      FOREIGN KEY (voucher_code_id) REFERENCES public.voucher_codes(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_registrations_price_confirmed_by_fkey'
      AND conrelid = 'public.course_registrations'::regclass
  ) THEN
    ALTER TABLE public.course_registrations
      ADD CONSTRAINT course_registrations_price_confirmed_by_fkey
      FOREIGN KEY (price_confirmed_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.course_registrations.price_snapshot_at IS
  'NULL until a real agreed-price snapshot is written. Phase 1 does not backfill this.';
COMMENT ON COLUMN public.course_registrations.snapshot_formula IS
  'course_invoice_v1: vat = round(net * rate / 100); gross = net + vat - discount - voucher. Credit is not part of gross.';
COMMENT ON COLUMN public.course_registrations.price_source_ref IS
  'Opaque uuid of the catalog row the snapshot was taken from (course, category, or session). No FK.';

-- ---------------------------------------------------------------------------
-- course_categories invoice policy (defaults keep automation off)
-- ---------------------------------------------------------------------------

ALTER TABLE public.course_categories
  ADD COLUMN IF NOT EXISTS invoice_timing_mode text NOT NULL DEFAULT 'off',
  ADD COLUMN IF NOT EXISTS invoice_lead_days integer,
  ADD COLUMN IF NOT EXISTS company_invoicing_mode text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS late_registration_policy text NOT NULL DEFAULT 'manual';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_categories_invoice_timing_mode_chk'
      AND conrelid = 'public.course_categories'::regclass
  ) THEN
    ALTER TABLE public.course_categories
      ADD CONSTRAINT course_categories_invoice_timing_mode_chk
      CHECK (invoice_timing_mode IN ('off', 'immediate', 'days_before_start', 'on_confirmed'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_categories_invoice_lead_days_chk'
      AND conrelid = 'public.course_categories'::regclass
  ) THEN
    ALTER TABLE public.course_categories
      ADD CONSTRAINT course_categories_invoice_lead_days_chk
      CHECK (invoice_lead_days IS NULL OR (invoice_lead_days >= 0 AND invoice_lead_days <= 365));
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
      CHECK (invoice_timing_mode <> 'days_before_start' OR invoice_lead_days IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_categories_company_invoicing_mode_chk'
      AND conrelid = 'public.course_categories'::regclass
  ) THEN
    ALTER TABLE public.course_categories
      ADD CONSTRAINT course_categories_company_invoicing_mode_chk
      CHECK (company_invoicing_mode IN ('manual', 'automatic_after_admin_batch'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_categories_late_registration_policy_chk'
      AND conrelid = 'public.course_categories'::regclass
  ) THEN
    ALTER TABLE public.course_categories
      ADD CONSTRAINT course_categories_late_registration_policy_chk
      CHECK (late_registration_policy IN ('manual', 'issue_immediately'));
  END IF;
END $$;

COMMENT ON COLUMN public.course_categories.invoice_timing_mode IS
  'Default off. Phase 1 does not schedule or issue invoices from this column.';

-- ---------------------------------------------------------------------------
-- invoices: document role, source link, open/QR amounts, status issued
-- ---------------------------------------------------------------------------

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS document_role text NOT NULL DEFAULT 'invoice',
  ADD COLUMN IF NOT EXISTS source_invoice_id uuid,
  ADD COLUMN IF NOT EXISTS open_amount_rappen integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qr_amount_rappen integer NOT NULL DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoices_document_role_chk'
      AND conrelid = 'public.invoices'::regclass
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_document_role_chk
      CHECK (document_role IN ('invoice', 'credit_note'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoices_source_invoice_id_fkey'
      AND conrelid = 'public.invoices'::regclass
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_source_invoice_id_fkey
      FOREIGN KEY (source_invoice_id) REFERENCES public.invoices(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoices_source_invoice_not_self_chk'
      AND conrelid = 'public.invoices'::regclass
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_source_invoice_not_self_chk
      CHECK (source_invoice_id IS NULL OR source_invoice_id <> id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoices_open_amount_nonneg_chk'
      AND conrelid = 'public.invoices'::regclass
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_open_amount_nonneg_chk
      CHECK (open_amount_rappen >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoices_qr_amount_nonneg_chk'
      AND conrelid = 'public.invoices'::regclass
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_qr_amount_nonneg_chk
      CHECK (qr_amount_rappen >= 0);
  END IF;
END $$;

-- Keep every historical status. Add issued. Do not rewrite existing rows.
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS check_status;
ALTER TABLE public.invoices
  ADD CONSTRAINT check_status
  CHECK (status::text = ANY (ARRAY[
    'draft',
    'pdf_created',
    'sent',
    'paid',
    'overdue',
    'cancelled',
    'issued'
  ]::text[]));

COMMENT ON COLUMN public.invoices.open_amount_rappen IS
  'Structural default 0 on historical rows. Not a backfill of agreed gross minus payments.';
COMMENT ON COLUMN public.invoices.qr_amount_rappen IS
  'Equals open_amount_rappen for course invoices issued by issue_course_invoice. Historical rows stay 0.';
COMMENT ON COLUMN public.invoices.document_role IS
  'invoice or credit_note. Distinct from document_kind (invoice or quote).';

-- ---------------------------------------------------------------------------
-- invoice_items course metadata. line_kind stays nullable for historical rows.
-- ---------------------------------------------------------------------------

ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS registration_id uuid,
  ADD COLUMN IF NOT EXISTS line_kind text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoice_items_registration_id_fkey'
      AND conrelid = 'public.invoice_items'::regclass
  ) THEN
    ALTER TABLE public.invoice_items
      ADD CONSTRAINT invoice_items_registration_id_fkey
      FOREIGN KEY (registration_id) REFERENCES public.course_registrations(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoice_items_line_kind_chk'
      AND conrelid = 'public.invoice_items'::regclass
  ) THEN
    ALTER TABLE public.invoice_items
      ADD CONSTRAINT invoice_items_line_kind_chk
      CHECK (
        line_kind IS NULL
        OR line_kind IN ('course', 'discount', 'voucher', 'credit_application')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoice_items_registration_id
  ON public.invoice_items (registration_id)
  WHERE registration_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- course_invoice_bindings
-- One registration → one invoice. Not granted DELETE. No client policies.
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

-- ---------------------------------------------------------------------------
-- course_invoice_batches
-- At most one draft or approved batch per tenant+course+company.
-- Cancelled and issued batches do not block a new draft.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.course_invoice_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft',
  approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT course_invoice_batches_status_chk
    CHECK (status IN ('draft', 'approved', 'issued', 'cancelled')),
  CONSTRAINT course_invoice_batches_issued_has_invoice_chk
    CHECK (status <> 'issued' OR invoice_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS course_invoice_batches_one_open_company_uidx
  ON public.course_invoice_batches (tenant_id, course_id, company_id)
  WHERE status IN ('draft', 'approved');

CREATE INDEX IF NOT EXISTS idx_course_invoice_batches_tenant_status
  ON public.course_invoice_batches (tenant_id, status);

ALTER TABLE public.course_invoice_batches ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- course_invoice_batch_items
-- Unique inside a batch. A registration cannot sit in two draft/approved batches.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.course_invoice_batch_items (
  batch_id uuid NOT NULL REFERENCES public.course_invoice_batches(id) ON DELETE RESTRICT,
  registration_id uuid NOT NULL REFERENCES public.course_registrations(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT course_invoice_batch_items_pkey PRIMARY KEY (batch_id, registration_id)
);

CREATE INDEX IF NOT EXISTS idx_course_invoice_batch_items_registration
  ON public.course_invoice_batch_items (registration_id);

ALTER TABLE public.course_invoice_batch_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.course_invoice_batch_items_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_batch_tenant uuid;
  v_batch_status text;
  v_reg_tenant uuid;
BEGIN
  SELECT b.tenant_id, b.status
    INTO v_batch_tenant, v_batch_status
  FROM public.course_invoice_batches b
  WHERE b.id = NEW.batch_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'batch_not_found' USING ERRCODE = 'no_data_found';
  END IF;

  SELECT cr.tenant_id
    INTO v_reg_tenant
  FROM public.course_registrations cr
  WHERE cr.id = NEW.registration_id;

  IF NOT FOUND OR v_reg_tenant IS DISTINCT FROM v_batch_tenant THEN
    RAISE EXCEPTION 'batch_item_tenant_mismatch' USING ERRCODE = 'check_violation';
  END IF;

  IF v_batch_status IN ('draft', 'approved') AND EXISTS (
    SELECT 1
    FROM public.course_invoice_batch_items bi
    JOIN public.course_invoice_batches other ON other.id = bi.batch_id
    WHERE bi.registration_id = NEW.registration_id
      AND bi.batch_id IS DISTINCT FROM NEW.batch_id
      AND other.tenant_id = v_batch_tenant
      AND other.status IN ('draft', 'approved')
  ) THEN
    RAISE EXCEPTION 'registration_in_open_batch' USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_course_invoice_batch_items_guard
  ON public.course_invoice_batch_items;

CREATE TRIGGER trg_course_invoice_batch_items_guard
  BEFORE INSERT OR UPDATE OF batch_id, registration_id
  ON public.course_invoice_batch_items
  FOR EACH ROW
  EXECUTE FUNCTION public.course_invoice_batch_items_guard();

-- ---------------------------------------------------------------------------
-- invoice_delivery_attempts
-- attempt_no 1 is the first send. 2..4 are the only automatic retries.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.invoice_delivery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  registration_id uuid REFERENCES public.course_registrations(id) ON DELETE RESTRICT,
  recipient text NOT NULL,
  attempt_no integer NOT NULL,
  status text NOT NULL,
  provider_message_id text,
  error text,
  job_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  CONSTRAINT invoice_delivery_attempts_attempt_key UNIQUE (invoice_id, attempt_no),
  CONSTRAINT invoice_delivery_attempts_attempt_no_chk CHECK (attempt_no BETWEEN 1 AND 4),
  CONSTRAINT invoice_delivery_attempts_status_chk CHECK (status IN ('sending', 'sent', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_invoice_delivery_attempts_tenant_invoice
  ON public.invoice_delivery_attempts (tenant_id, invoice_id);

ALTER TABLE public.invoice_delivery_attempts ENABLE ROW LEVEL SECURITY;

COMMENT ON COLUMN public.invoice_delivery_attempts.attempt_no IS
  '1 = first send. 2, 3 and 4 = the three automatic retries. No fifth attempt.';

-- ---------------------------------------------------------------------------
-- invoice_admin_tasks
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.invoice_admin_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE RESTRICT,
  registration_id uuid REFERENCES public.course_registrations(id) ON DELETE RESTRICT,
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoice_admin_tasks_kind_chk
    CHECK (kind IN ('missing_email', 'legacy_price', 'late_registration', 'cancellation_decision')),
  CONSTRAINT invoice_admin_tasks_status_chk
    CHECK (status IN ('open', 'done')),
  CONSTRAINT invoice_admin_tasks_subject_chk
    CHECK (invoice_id IS NOT NULL OR registration_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_invoice_admin_tasks_tenant_status
  ON public.invoice_admin_tasks (tenant_id, status);

ALTER TABLE public.invoice_admin_tasks ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- invoice_documents
-- Metadata only. Phase 1 does not create a storage bucket.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.invoice_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  kind text NOT NULL,
  storage_path text NOT NULL,
  sha256 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoice_documents_kind_chk CHECK (kind IN ('issued_pdf')),
  CONSTRAINT invoice_documents_invoice_kind_key UNIQUE (invoice_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_invoice_documents_tenant_invoice
  ON public.invoice_documents (tenant_id, invoice_id);

ALTER TABLE public.invoice_documents ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.invoice_documents IS
  'Private document metadata. Phase 1 creates no storage bucket and no public URL.';

-- ---------------------------------------------------------------------------
-- course_invoice_events
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.course_invoice_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  registration_id uuid REFERENCES public.course_registrations(id) ON DELETE RESTRICT,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE RESTRICT,
  job_id text,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT course_invoice_events_kind_chk CHECK (kind IN (
    'snapshot_written',
    'price_confirmed',
    'price_snapshot_corrected',
    'invoice_issued',
    'invoice_issue_skipped',
    'email_attempt',
    'email_sent',
    'email_failed',
    'retry_scheduled',
    'admin_resend',
    'cancellation_decision',
    'credit_note_issued'
  ))
);

CREATE INDEX IF NOT EXISTS idx_course_invoice_events_tenant_created
  ON public.course_invoice_events (tenant_id, created_at);

CREATE INDEX IF NOT EXISTS idx_course_invoice_events_registration
  ON public.course_invoice_events (registration_id)
  WHERE registration_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_course_invoice_events_invoice
  ON public.course_invoice_events (invoice_id)
  WHERE invoice_id IS NOT NULL;

ALTER TABLE public.course_invoice_events ENABLE ROW LEVEL SECURITY;

-- Reject a child row whose invoice, registration, course, or company is missing
-- or belongs to another tenant. One error for both cases, so the caller cannot
-- tell a foreign id from an unknown id. SECURITY DEFINER so RLS cannot hide
-- the referenced row and turn the check into a silent pass.
CREATE OR REPLACE FUNCTION public.course_invoice_child_tenant_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_row jsonb := to_jsonb(NEW);
  v_tenant uuid := NULLIF(v_row->>'tenant_id', '')::uuid;
  v_ref uuid;
BEGIN
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'tenant_mismatch' USING ERRCODE = 'check_violation';
  END IF;

  IF NULLIF(v_row->>'invoice_id', '') IS NOT NULL THEN
    v_ref := (v_row->>'invoice_id')::uuid;
    PERFORM 1 FROM public.invoices i WHERE i.id = v_ref AND i.tenant_id = v_tenant;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'tenant_mismatch' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NULLIF(v_row->>'registration_id', '') IS NOT NULL THEN
    v_ref := (v_row->>'registration_id')::uuid;
    PERFORM 1 FROM public.course_registrations cr
    WHERE cr.id = v_ref AND cr.tenant_id = v_tenant;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'tenant_mismatch' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NULLIF(v_row->>'course_id', '') IS NOT NULL THEN
    v_ref := (v_row->>'course_id')::uuid;
    PERFORM 1 FROM public.courses c WHERE c.id = v_ref AND c.tenant_id = v_tenant;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'tenant_mismatch' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NULLIF(v_row->>'company_id', '') IS NOT NULL THEN
    v_ref := (v_row->>'company_id')::uuid;
    PERFORM 1 FROM public.companies co WHERE co.id = v_ref AND co.tenant_id = v_tenant;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'tenant_mismatch' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_course_invoice_bindings_tenant ON public.course_invoice_bindings;
CREATE TRIGGER trg_course_invoice_bindings_tenant
  BEFORE INSERT OR UPDATE ON public.course_invoice_bindings
  FOR EACH ROW EXECUTE FUNCTION public.course_invoice_child_tenant_guard();

DROP TRIGGER IF EXISTS trg_course_invoice_batches_tenant ON public.course_invoice_batches;
CREATE TRIGGER trg_course_invoice_batches_tenant
  BEFORE INSERT OR UPDATE ON public.course_invoice_batches
  FOR EACH ROW EXECUTE FUNCTION public.course_invoice_child_tenant_guard();

DROP TRIGGER IF EXISTS trg_invoice_delivery_attempts_tenant ON public.invoice_delivery_attempts;
CREATE TRIGGER trg_invoice_delivery_attempts_tenant
  BEFORE INSERT OR UPDATE ON public.invoice_delivery_attempts
  FOR EACH ROW EXECUTE FUNCTION public.course_invoice_child_tenant_guard();

DROP TRIGGER IF EXISTS trg_invoice_admin_tasks_tenant ON public.invoice_admin_tasks;
CREATE TRIGGER trg_invoice_admin_tasks_tenant
  BEFORE INSERT OR UPDATE ON public.invoice_admin_tasks
  FOR EACH ROW EXECUTE FUNCTION public.course_invoice_child_tenant_guard();

DROP TRIGGER IF EXISTS trg_invoice_documents_tenant ON public.invoice_documents;
CREATE TRIGGER trg_invoice_documents_tenant
  BEFORE INSERT OR UPDATE ON public.invoice_documents
  FOR EACH ROW EXECUTE FUNCTION public.course_invoice_child_tenant_guard();

DROP TRIGGER IF EXISTS trg_course_invoice_events_tenant ON public.course_invoice_events;
CREATE TRIGGER trg_course_invoice_events_tenant
  BEFORE INSERT OR UPDATE ON public.course_invoice_events
  FOR EACH ROW EXECUTE FUNCTION public.course_invoice_child_tenant_guard();

-- ---------------------------------------------------------------------------
-- Keep explicit course-invoice totals.
-- Appointment invoices do not set this GUC, so their VAT trigger is unchanged.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.calculate_invoice_vat()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF current_setting('simy.course_invoice_explicit_totals', true) = 'on' THEN
    RETURN NEW;
  END IF;

  NEW.vat_amount_rappen := ROUND((NEW.subtotal_rappen * NEW.vat_rate / 100)::numeric);
  NEW.total_amount_rappen := NEW.subtotal_rappen + NEW.vat_amount_rappen - NEW.discount_amount_rappen;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- JWT cannot forge payment fields or the agreed-price snapshot.
-- Service role (auth.role() = service_role) still can. Existing protections stay.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.course_registrations_protect_payment_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
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
    NEW.agreed_currency := 'CHF';
    NEW.price_source := NULL;
    NEW.price_source_ref := NULL;
    NEW.agreed_net_rappen := NULL;
    NEW.discount_rappen := 0;
    NEW.voucher_rappen := 0;
    NEW.voucher_code_id := NULL;
    NEW.voucher_label := NULL;
    NEW.agreed_vat_rate := NULL;
    NEW.agreed_vat_rappen := NULL;
    NEW.agreed_gross_rappen := NULL;
    NEW.credit_applied_rappen := 0;
    NEW.agreed_payment_method := NULL;
    NEW.price_snapshot_at := NULL;
    NEW.price_confirmed_by := NULL;
    NEW.snapshot_formula := NULL;
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
  NEW.agreed_currency := OLD.agreed_currency;
  NEW.price_source := OLD.price_source;
  NEW.price_source_ref := OLD.price_source_ref;
  NEW.agreed_net_rappen := OLD.agreed_net_rappen;
  NEW.discount_rappen := OLD.discount_rappen;
  NEW.voucher_rappen := OLD.voucher_rappen;
  NEW.voucher_code_id := OLD.voucher_code_id;
  NEW.voucher_label := OLD.voucher_label;
  NEW.agreed_vat_rate := OLD.agreed_vat_rate;
  NEW.agreed_vat_rappen := OLD.agreed_vat_rappen;
  NEW.agreed_gross_rappen := OLD.agreed_gross_rappen;
  NEW.credit_applied_rappen := OLD.credit_applied_rappen;
  NEW.agreed_payment_method := OLD.agreed_payment_method;
  NEW.price_snapshot_at := OLD.price_snapshot_at;
  NEW.price_confirmed_by := OLD.price_confirmed_by;
  NEW.snapshot_formula := OLD.snapshot_formula;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_course_registrations_protect_payment_fields
  ON public.course_registrations;

CREATE TRIGGER trg_course_registrations_protect_payment_fields
  BEFORE INSERT OR UPDATE ON public.course_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.course_registrations_protect_payment_fields();

-- ---------------------------------------------------------------------------
-- issue_course_invoice
-- One transaction: validate, allocate the existing invoice number, insert
-- invoice + items + binding + event, or return the invoice already bound.
-- Does not send email, render PDF, or write payments.
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
AS $$
DECLARE
  v_ids uuid[];
  v_in_count integer;
  v_distinct_count integer;
  v_locked integer;
  v_bound integer;
  v_existing uuid;
  v_due_days integer;
  v_reg record;
  v_reg_json jsonb;
  v_course_id uuid;
  v_course_tenant uuid;
  v_course_name text;
  v_company_id uuid;
  v_billing_mode text;
  v_rate numeric;
  v_rates_differ boolean := false;
  v_user_id uuid;
  v_net integer := 0;
  v_vat integer := 0;
  v_discount integer := 0;
  v_voucher integer := 0;
  v_gross integer := 0;
  v_credit integer := 0;
  v_confirmed integer := 0;
  v_pay integer;
  v_open integer;
  v_expected_vat integer;
  v_expected_gross integer;
  v_pay_status text;
  v_billing_type text;
  v_bill_company text;
  v_bill_contact text;
  v_bill_email text;
  v_bill_street text;
  v_bill_zip text;
  v_bill_city text;
  v_bill_vat text;
  v_invoice_company_id uuid;
  v_co_name text;
  v_co_contact text;
  v_co_email text;
  v_co_street text;
  v_co_street_nr text;
  v_co_zip text;
  v_co_city text;
  v_co_country text;
  v_co_vat text;
  v_new_invoice uuid;
  v_invoice_number text;
  v_sort integer;
BEGIN
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_required' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_registration_ids IS NULL OR cardinality(p_registration_ids) < 1 THEN
    RAISE EXCEPTION 'invalid_registration_ids' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT count(*)::integer,
         count(DISTINCT t.id)::integer,
         array_agg(t.id)
    INTO v_in_count, v_distinct_count, v_ids
  FROM unnest(p_registration_ids) AS t(id);

  IF v_in_count < 1
     OR v_distinct_count <> v_in_count
     OR EXISTS (SELECT 1 FROM unnest(p_registration_ids) AS t(id) WHERE t.id IS NULL) THEN
    RAISE EXCEPTION 'invalid_registration_ids' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT COALESCE(t.invoice_due_days, 30)
    INTO v_due_days
  FROM public.tenants t
  WHERE t.id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'tenant_not_found' USING ERRCODE = 'no_data_found';
  END IF;

  IF v_due_days IS NULL OR v_due_days < 0 THEN
    v_due_days := 30;
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

  SELECT count(*)::integer
    INTO v_locked
  FROM (
    SELECT cr.id
    FROM public.course_registrations cr
    WHERE cr.tenant_id = p_tenant_id
      AND cr.id = ANY (v_ids)
    ORDER BY cr.id
    FOR UPDATE
  ) locked_regs;

  IF v_locked <> cardinality(v_ids) THEN
    RAISE EXCEPTION 'registration_not_found' USING ERRCODE = 'no_data_found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.payments p
    WHERE p.course_registration_id = ANY (v_ids)
      AND p.tenant_id IS DISTINCT FROM p_tenant_id
  ) THEN
    RAISE EXCEPTION 'registration_not_billable' USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*)::integer
    INTO v_bound
  FROM (
    SELECT b.registration_id
    FROM public.course_invoice_bindings b
    WHERE b.tenant_id = p_tenant_id
      AND b.registration_id = ANY (v_ids)
    ORDER BY b.registration_id
    FOR UPDATE
  ) bound_regs;

  IF v_bound = cardinality(v_ids) THEN
    SELECT b.invoice_id
      INTO v_existing
    FROM public.course_invoice_bindings b
    WHERE b.tenant_id = p_tenant_id
      AND b.registration_id = ANY (v_ids)
    GROUP BY b.invoice_id
    HAVING count(*) = cardinality(v_ids);

    IF v_existing IS NULL THEN
      RAISE EXCEPTION 'binding_conflict' USING ERRCODE = 'unique_violation';
    END IF;

    RETURN QUERY
    SELECT i.id, i.invoice_number::text, false
    FROM public.invoices i
    WHERE i.id = v_existing
      AND i.tenant_id = p_tenant_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'registration_not_billable' USING ERRCODE = 'check_violation';
    END IF;
    RETURN;
  ELSIF v_bound > 0 THEN
    RAISE EXCEPTION 'binding_conflict' USING ERRCODE = 'unique_violation';
  END IF;

  FOR v_reg IN
    SELECT cr.*
    FROM public.course_registrations cr
    WHERE cr.tenant_id = p_tenant_id
      AND cr.id = ANY (v_ids)
    ORDER BY cr.id
  LOOP
    IF v_reg.deleted_at IS NOT NULL
       OR v_reg.status IS NULL
       OR v_reg.status NOT IN ('pending', 'confirmed', 'completed') THEN
      RAISE EXCEPTION 'registration_not_billable' USING ERRCODE = 'check_violation';
    END IF;

    IF v_reg.payment_status = 'paid' THEN
      RAISE EXCEPTION 'registration_not_billable' USING ERRCODE = 'check_violation';
    END IF;

    IF v_reg.price_snapshot_at IS NULL
       OR v_reg.agreed_net_rappen IS NULL
       OR v_reg.agreed_vat_rate IS NULL
       OR v_reg.agreed_vat_rappen IS NULL
       OR v_reg.agreed_gross_rappen IS NULL THEN
      RAISE EXCEPTION 'missing_snapshot' USING ERRCODE = 'check_violation';
    END IF;

    IF v_reg.agreed_currency IS DISTINCT FROM 'CHF' THEN
      RAISE EXCEPTION 'unsupported_currency' USING ERRCODE = 'check_violation';
    END IF;

    IF v_reg.agreed_payment_method IS DISTINCT FROM 'invoice'
       OR v_reg.payment_method IS DISTINCT FROM 'invoice' THEN
      RAISE EXCEPTION 'payment_method_not_invoice' USING ERRCODE = 'check_violation';
    END IF;

    IF v_reg.snapshot_formula IS NOT NULL
       AND v_reg.snapshot_formula IS DISTINCT FROM 'course_invoice_v1' THEN
      RAISE EXCEPTION 'snapshot_inconsistent' USING ERRCODE = 'check_violation';
    END IF;

    v_expected_vat := round(v_reg.agreed_net_rappen::numeric * v_reg.agreed_vat_rate / 100)::integer;
    v_expected_gross := v_reg.agreed_net_rappen + v_expected_vat - v_reg.discount_rappen - v_reg.voucher_rappen;

    IF v_reg.agreed_net_rappen < 0
       OR v_reg.discount_rappen < 0
       OR v_reg.voucher_rappen < 0
       OR v_reg.credit_applied_rappen < 0
       OR v_reg.agreed_vat_rate < 0
       OR v_reg.agreed_vat_rappen < 0
       OR v_reg.agreed_gross_rappen < 0
       OR v_reg.agreed_vat_rappen <> v_expected_vat
       OR v_reg.agreed_gross_rappen <> v_expected_gross THEN
      RAISE EXCEPTION 'snapshot_inconsistent' USING ERRCODE = 'check_violation';
    END IF;

    IF v_reg.voucher_code_id IS NOT NULL THEN
      PERFORM 1
      FROM public.voucher_codes vc
      WHERE vc.id = v_reg.voucher_code_id
        AND vc.tenant_id = p_tenant_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'voucher_not_found' USING ERRCODE = 'no_data_found';
      END IF;
    END IF;

    IF v_reg.user_id IS NOT NULL THEN
      PERFORM 1
      FROM public.users u
      WHERE u.id = v_reg.user_id
        AND u.tenant_id = p_tenant_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'registration_not_billable' USING ERRCODE = 'check_violation';
      END IF;
    END IF;

    SELECT to_jsonb(cr)
      INTO v_reg_json
    FROM public.course_registrations cr
    WHERE cr.id = v_reg.id
      AND cr.tenant_id = p_tenant_id;

    IF (v_reg_json ? 'invoice_id') AND NULLIF(v_reg_json->>'invoice_id', '') IS NOT NULL THEN
      RAISE EXCEPTION 'registration_already_invoiced' USING ERRCODE = 'unique_violation';
    END IF;

    IF v_course_id IS NULL THEN
      v_course_id := v_reg.course_id;
    ELSIF v_course_id IS DISTINCT FROM v_reg.course_id THEN
      RAISE EXCEPTION 'registrations_not_same_course' USING ERRCODE = 'check_violation';
    END IF;

    IF v_rate IS NULL THEN
      v_rate := v_reg.agreed_vat_rate;
    ELSIF v_rate IS DISTINCT FROM v_reg.agreed_vat_rate THEN
      v_rates_differ := true;
    END IF;

    IF cardinality(v_ids) = 1 THEN
      IF v_reg.user_id IS NULL THEN
        RAISE EXCEPTION 'registration_not_billable' USING ERRCODE = 'check_violation';
      END IF;
      v_user_id := v_reg.user_id;
    ELSIF v_user_id IS NULL AND v_reg.user_id IS NOT NULL THEN
      v_user_id := v_reg.user_id;
    END IF;

    v_bill_contact := NULLIF(btrim(concat_ws(' ', v_reg.first_name, v_reg.last_name)), '');
    v_bill_email := v_reg.email;
    v_bill_street := NULLIF(btrim(concat_ws(' ', v_reg.street, v_reg.street_nr)), '');
    v_bill_zip := v_reg.zip;
    v_bill_city := v_reg.city;

    SELECT COALESCE(SUM(GREATEST(
             0,
             COALESCE(p.total_amount_rappen, 0) - COALESCE(p.refunded_amount_rappen, 0)
           )), 0)::integer
      INTO v_pay
    FROM public.payments p
    WHERE p.tenant_id = p_tenant_id
      AND p.course_registration_id = v_reg.id
      AND p.payment_status IN ('paid', 'completed');

    v_net := v_net + v_reg.agreed_net_rappen;
    v_vat := v_vat + v_reg.agreed_vat_rappen;
    v_discount := v_discount + v_reg.discount_rappen;
    v_voucher := v_voucher + v_reg.voucher_rappen;
    v_gross := v_gross + v_reg.agreed_gross_rappen;
    v_credit := v_credit + v_reg.credit_applied_rappen;
    v_confirmed := v_confirmed + COALESCE(v_pay, 0);
  END LOOP;

  IF cardinality(v_ids) > 1 AND v_user_id IS NULL THEN
    RAISE EXCEPTION 'registration_not_billable' USING ERRCODE = 'check_violation';
  END IF;

  SELECT c.tenant_id, c.name, c.company_id, c.billing_mode
    INTO v_course_tenant, v_course_name, v_company_id, v_billing_mode
  FROM public.courses c
  WHERE c.id = v_course_id;

  IF NOT FOUND OR v_course_tenant IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'course_not_found' USING ERRCODE = 'no_data_found';
  END IF;

  v_billing_type := 'individual';
  v_bill_company := NULL;
  v_bill_vat := NULL;
  v_invoice_company_id := NULL;

  IF cardinality(v_ids) > 1 THEN
    IF v_billing_mode IS DISTINCT FROM 'company_collective' OR v_company_id IS NULL THEN
      RAISE EXCEPTION 'company_required' USING ERRCODE = 'check_violation';
    END IF;

    SELECT co.name, co.contact_person, co.email, co.street, co.street_nr,
           co.zip, co.city, co.country, co.vat_number
      INTO v_co_name, v_co_contact, v_co_email, v_co_street, v_co_street_nr,
           v_co_zip, v_co_city, v_co_country, v_co_vat
    FROM public.companies co
    WHERE co.id = v_company_id
      AND co.tenant_id = p_tenant_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'company_not_found' USING ERRCODE = 'no_data_found';
    END IF;

    v_billing_type := 'company';
    v_invoice_company_id := v_company_id;
    v_bill_company := v_co_name;
    v_bill_contact := v_co_contact;
    v_bill_email := v_co_email;
    v_bill_street := NULLIF(btrim(concat_ws(' ', v_co_street, v_co_street_nr)), '');
    v_bill_zip := v_co_zip;
    v_bill_city := v_co_city;
    v_bill_vat := v_co_vat;
  END IF;

  IF v_gross <> (v_net + v_vat - v_discount - v_voucher) OR v_gross < 0 THEN
    RAISE EXCEPTION 'snapshot_inconsistent' USING ERRCODE = 'check_violation';
  END IF;

  v_open := GREATEST(0, v_gross - v_confirmed - v_credit);
  IF v_open < 0 THEN
    RAISE EXCEPTION 'snapshot_inconsistent' USING ERRCODE = 'check_violation';
  END IF;

  IF v_open = 0 THEN
    v_pay_status := 'paid';
  ELSIF (v_confirmed + v_credit) > 0 THEN
    v_pay_status := 'partial';
  ELSE
    v_pay_status := 'pending';
  END IF;

  v_new_invoice := gen_random_uuid();

  BEGIN
    v_invoice_number := public.allocate_invoice_number(p_tenant_id);
    PERFORM set_config('simy.course_invoice_explicit_totals', 'on', true);

    INSERT INTO public.invoices (
      id,
      tenant_id,
      user_id,
      staff_id,
      company_id,
      invoice_number,
      invoice_date,
      due_date,
      billing_type,
      billing_company_name,
      billing_contact_person,
      billing_email,
      billing_street,
      billing_zip,
      billing_city,
      billing_country,
      billing_vat_number,
      subtotal_rappen,
      vat_rate,
      vat_amount_rappen,
      discount_amount_rappen,
      total_amount_rappen,
      status,
      payment_status,
      payment_method,
      paid_amount_rappen,
      document_kind,
      document_role,
      source_invoice_id,
      open_amount_rappen,
      qr_amount_rappen
    ) VALUES (
      v_new_invoice,
      p_tenant_id,
      v_user_id,
      p_actor_user_id,
      v_invoice_company_id,
      v_invoice_number,
      CURRENT_DATE,
      CURRENT_DATE + v_due_days,
      v_billing_type,
      v_bill_company,
      v_bill_contact,
      v_bill_email,
      v_bill_street,
      v_bill_zip,
      v_bill_city,
      COALESCE(NULLIF(v_co_country, ''), 'CH'),
      v_bill_vat,
      v_net,
      CASE WHEN v_rates_differ THEN NULL ELSE v_rate END,
      v_vat,
      v_discount + v_voucher,
      v_gross,
      'issued',
      v_pay_status,
      'invoice',
      v_confirmed,
      'invoice',
      'invoice',
      NULL,
      v_open,
      v_open
    );

    PERFORM set_config('simy.course_invoice_explicit_totals', 'off', true);

    v_sort := 0;
    FOR v_reg IN
      SELECT cr.*
      FROM public.course_registrations cr
      WHERE cr.tenant_id = p_tenant_id
        AND cr.id = ANY (v_ids)
      ORDER BY cr.id
    LOOP
      v_sort := v_sort + 1;
      INSERT INTO public.invoice_items (
        invoice_id, tenant_id, registration_id, line_kind,
        product_name, product_description,
        quantity, unit_price_rappen, total_price_rappen,
        vat_rate, vat_amount_rappen, sort_order
      ) VALUES (
        v_new_invoice,
        p_tenant_id,
        v_reg.id,
        'course',
        LEFT(COALESCE(v_course_name, 'Kurs'), 255),
        NULLIF(btrim(concat_ws(' ', 'Teilnehmer:', v_reg.first_name, v_reg.last_name)), 'Teilnehmer:'),
        1,
        v_reg.agreed_net_rappen,
        v_reg.agreed_net_rappen,
        v_reg.agreed_vat_rate,
        v_reg.agreed_vat_rappen,
        v_sort
      );

      IF v_reg.discount_rappen > 0 THEN
        v_sort := v_sort + 1;
        INSERT INTO public.invoice_items (
          invoice_id, tenant_id, registration_id, line_kind,
          product_name, quantity, unit_price_rappen, total_price_rappen,
          vat_rate, vat_amount_rappen, sort_order
        ) VALUES (
          v_new_invoice, p_tenant_id, v_reg.id, 'discount',
          'Rabatt', 1, v_reg.discount_rappen, v_reg.discount_rappen,
          0, 0, v_sort
        );
      END IF;

      IF v_reg.voucher_rappen > 0 THEN
        v_sort := v_sort + 1;
        INSERT INTO public.invoice_items (
          invoice_id, tenant_id, registration_id, line_kind,
          product_name, quantity, unit_price_rappen, total_price_rappen,
          vat_rate, vat_amount_rappen, sort_order
        ) VALUES (
          v_new_invoice, p_tenant_id, v_reg.id, 'voucher',
          LEFT(COALESCE(NULLIF(btrim(v_reg.voucher_label), ''), 'Gutschein'), 255),
          1, v_reg.voucher_rappen, v_reg.voucher_rappen,
          0, 0, v_sort
        );
      END IF;

      IF v_reg.credit_applied_rappen > 0 THEN
        v_sort := v_sort + 1;
        INSERT INTO public.invoice_items (
          invoice_id, tenant_id, registration_id, line_kind,
          product_name, quantity, unit_price_rappen, total_price_rappen,
          vat_rate, vat_amount_rappen, sort_order
        ) VALUES (
          v_new_invoice, p_tenant_id, v_reg.id, 'credit_application',
          'Guthaben', 1, v_reg.credit_applied_rappen, v_reg.credit_applied_rappen,
          0, 0, v_sort
        );
      END IF;
    END LOOP;

    INSERT INTO public.course_invoice_bindings (tenant_id, registration_id, invoice_id)
    SELECT p_tenant_id, t.id, v_new_invoice
    FROM unnest(v_ids) AS t(id);

    INSERT INTO public.course_invoice_events (
      tenant_id, registration_id, invoice_id, job_id, kind, payload
    ) VALUES (
      p_tenant_id,
      CASE WHEN cardinality(v_ids) = 1 THEN v_ids[1] ELSE NULL END,
      v_new_invoice,
      NULL,
      'invoice_issued',
      jsonb_build_object(
        'formula', 'course_invoice_v1',
        'invoice_number', v_invoice_number,
        'registration_ids', to_jsonb(v_ids),
        'total_amount_rappen', v_gross,
        'open_amount_rappen', v_open,
        'qr_amount_rappen', v_open,
        'confirmed_payments_rappen', v_confirmed,
        'credit_applied_rappen', v_credit
      )
    );

    RETURN QUERY
    SELECT v_new_invoice, v_invoice_number, true;
    RETURN;
  EXCEPTION
    WHEN unique_violation THEN
      PERFORM set_config('simy.course_invoice_explicit_totals', 'off', true);

      SELECT b.invoice_id
        INTO v_existing
      FROM public.course_invoice_bindings b
      WHERE b.tenant_id = p_tenant_id
        AND b.registration_id = ANY (v_ids)
      GROUP BY b.invoice_id
      HAVING count(*) = cardinality(v_ids);

      IF v_existing IS NULL THEN
        RAISE;
      END IF;

      RETURN QUERY
      SELECT i.id, i.invoice_number::text, false
      FROM public.invoices i
      WHERE i.id = v_existing
        AND i.tenant_id = p_tenant_id;

      IF NOT FOUND THEN
        RAISE;
      END IF;
      RETURN;
  END;
END;
$$;

COMMENT ON FUNCTION public.issue_course_invoice(uuid, uuid[], uuid) IS
  'Atomically issue one course invoice for registrations that already have a course_invoice_v1 snapshot and agreed_payment_method invoice. Returns the existing binding on retry. Does not email, render PDF, or write payments. Course invoice automation stays off until a later phase calls this.';

REVOKE ALL ON FUNCTION public.issue_course_invoice(uuid, uuid[], uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.issue_course_invoice(uuid, uuid[], uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_course_invoice(uuid, uuid[], uuid) TO postgres, service_role;

REVOKE ALL ON FUNCTION public.course_invoice_batch_items_guard() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.course_invoice_batch_items_guard() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.course_invoice_batch_items_guard() TO postgres, service_role;

REVOKE ALL ON FUNCTION public.course_invoice_child_tenant_guard() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.course_invoice_child_tenant_guard() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.course_invoice_child_tenant_guard() TO postgres, service_role;

-- No client policies. RLS default-deny. service_role bypasses RLS and is the only grantee.
REVOKE ALL ON TABLE public.course_invoice_bindings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.course_invoice_batches FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.course_invoice_batch_items FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.invoice_delivery_attempts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.invoice_admin_tasks FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.invoice_documents FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.course_invoice_events FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.course_invoice_bindings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.course_invoice_batches TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.course_invoice_batch_items TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.invoice_delivery_attempts TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.invoice_admin_tasks TO service_role;
GRANT SELECT, INSERT ON TABLE public.invoice_documents TO service_role;
GRANT SELECT, INSERT ON TABLE public.course_invoice_events TO service_role;
