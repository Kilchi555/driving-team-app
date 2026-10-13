-- Cash-to-bank deposit reports. Additive. Do not apply from the application deploy.
--
-- Snapshot updates for a confirmed transfer live in
-- 20261013_cash_bank_phase1_remediation.sql. This file does not rewrite
-- historical cash_transactions or existing balance rows by itself.
--
-- The transfer journal is separate from accounting_entries because that table
-- only allows income and expense, and the accounting screen treats every
-- non-income row as an expense. Dr 1020 / Cr 1000 is stored here instead.
--
-- Rollback before any row is reconciled:
--   DROP FUNCTION IF EXISTS public.confirm_cash_bank_deposit(uuid, uuid, uuid);
--   DROP FUNCTION IF EXISTS public.select_cash_bank_deposit_candidate(uuid, uuid, uuid, text, integer, date, text, text, text);
--   DROP FUNCTION IF EXISTS public.apply_cash_deposit_attribution(uuid, uuid, uuid, uuid, text);
--   DROP FUNCTION IF EXISTS public.report_cash_bank_deposit(uuid, uuid, text, text, uuid, integer, date, uuid);
--   DROP TRIGGER IF EXISTS cash_deposit_reports_guard_trg ON public.cash_deposit_reports;
--   DROP FUNCTION IF EXISTS public.cash_deposit_reports_guard();
--   DROP TABLE IF EXISTS public.cash_deposit_attribution_events;
--   DROP TABLE IF EXISTS public.cash_bank_transfer_lines;
--   DROP TABLE IF EXISTS public.cash_bank_transfer_journals;
--   ALTER TABLE public.bank_import_records DROP COLUMN IF EXISTS cash_deposit_report_id;
--   DROP TABLE IF EXISTS public.cash_deposit_reports;
-- Rollback after a journal exists: do not drop the journal tables.
-- Insert a storno journal (storno_of_id set, lines reversed) and leave the
-- original lines in place. Do not DELETE posted lines.

CREATE TABLE IF NOT EXISTS public.cash_deposit_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  idempotency_key text NOT NULL,
  source_kind text NOT NULL CHECK (source_kind IN ('business', 'staff', 'admin')),
  source_user_id uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  amount_rappen integer NOT NULL CHECK (amount_rappen > 0 AND amount_rappen <= 100000000),
  currency text NOT NULL DEFAULT 'CHF' CHECK (currency = 'CHF'),
  reported_on date NOT NULL,
  reported_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'matched', 'reconciled', 'cancelled')),
  reference_token text NOT NULL,
  depositor_user_id uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  attribution_status text NOT NULL DEFAULT 'unassigned' CHECK (attribution_status IN ('unassigned', 'reported', 'confirmed')),
  attribution_updated_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  attribution_updated_at timestamptz,
  attribution_confirmed_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  attribution_confirmed_at timestamptz,
  candidate_dedupe_key text,
  candidate_amount_rappen integer,
  candidate_entry_date date,
  candidate_direction text CHECK (candidate_direction IS NULL OR candidate_direction IN ('credit', 'debit', 'reversal')),
  candidate_match_class text CHECK (candidate_match_class IS NULL OR candidate_match_class IN ('exact', 'suggestion', 'ambiguous', 'none', 'unresolved_amount', 'ineligible')),
  candidate_bank_ref text,
  confirmed_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  confirmed_at timestamptz,
  bank_import_record_id uuid,
  journal_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key),
  UNIQUE (tenant_id, reference_token),
  UNIQUE (bank_import_record_id),
  CONSTRAINT cash_deposit_reports_matched_chk CHECK (
    status <> 'matched' OR (
      candidate_match_class IN ('exact', 'suggestion')
      AND candidate_direction = 'credit'
      AND candidate_dedupe_key IS NOT NULL
      AND candidate_amount_rappen = amount_rappen
    )
  ),
  CONSTRAINT cash_deposit_reports_reconciled_chk CHECK (
    status <> 'reconciled' OR (journal_id IS NOT NULL AND bank_import_record_id IS NOT NULL)
  ),
  CONSTRAINT cash_deposit_reports_attribution_chk CHECK (
    (depositor_user_id IS NULL AND attribution_status = 'unassigned')
    OR (depositor_user_id IS NOT NULL AND attribution_status IN ('reported', 'confirmed'))
  )
);

CREATE INDEX IF NOT EXISTS cash_deposit_reports_tenant_status_idx
  ON public.cash_deposit_reports (tenant_id, status, reported_on DESC);

ALTER TABLE public.cash_deposit_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cash_deposit_reports_service_role ON public.cash_deposit_reports;
CREATE POLICY cash_deposit_reports_service_role ON public.cash_deposit_reports
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

REVOKE ALL ON TABLE public.cash_deposit_reports FROM PUBLIC;
REVOKE ALL ON TABLE public.cash_deposit_reports FROM anon;
REVOKE ALL ON TABLE public.cash_deposit_reports FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.cash_deposit_reports TO service_role;

CREATE OR REPLACE FUNCTION public.cash_deposit_reports_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF OLD.status = 'reconciled' THEN
    IF NEW.amount_rappen IS DISTINCT FROM OLD.amount_rappen
      OR NEW.currency IS DISTINCT FROM OLD.currency
      OR NEW.journal_id IS DISTINCT FROM OLD.journal_id
      OR NEW.bank_import_record_id IS DISTINCT FROM OLD.bank_import_record_id
      OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.candidate_dedupe_key IS DISTINCT FROM OLD.candidate_dedupe_key
      OR NEW.reported_on IS DISTINCT FROM OLD.reported_on
    THEN
      RAISE EXCEPTION 'reconciled_locked';
    END IF;
  END IF;
  IF OLD.status = 'cancelled' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'cancelled_locked';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cash_deposit_reports_guard_trg ON public.cash_deposit_reports;
CREATE TRIGGER cash_deposit_reports_guard_trg
  BEFORE UPDATE ON public.cash_deposit_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.cash_deposit_reports_guard();

REVOKE ALL ON FUNCTION public.cash_deposit_reports_guard() FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public.cash_deposit_attribution_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  deposit_id uuid NOT NULL REFERENCES public.cash_deposit_reports(id) ON DELETE RESTRICT,
  previous_user_id uuid,
  next_user_id uuid,
  actor_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('assign', 'correction')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cash_deposit_attribution_events_deposit_idx
  ON public.cash_deposit_attribution_events (tenant_id, deposit_id, created_at);

ALTER TABLE public.cash_deposit_attribution_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cash_deposit_attribution_events_service_role ON public.cash_deposit_attribution_events;
CREATE POLICY cash_deposit_attribution_events_service_role ON public.cash_deposit_attribution_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

REVOKE ALL ON TABLE public.cash_deposit_attribution_events FROM PUBLIC;
REVOKE ALL ON TABLE public.cash_deposit_attribution_events FROM anon;
REVOKE ALL ON TABLE public.cash_deposit_attribution_events FROM authenticated;
GRANT SELECT, INSERT ON TABLE public.cash_deposit_attribution_events TO service_role;

CREATE TABLE IF NOT EXISTS public.cash_bank_transfer_journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  deposit_id uuid NOT NULL REFERENCES public.cash_deposit_reports(id) ON DELETE RESTRICT,
  amount_rappen integer NOT NULL CHECK (amount_rappen > 0 AND amount_rappen <= 100000000),
  debit_account_number text NOT NULL DEFAULT '1020' CHECK (debit_account_number = '1020'),
  credit_account_number text NOT NULL DEFAULT '1000' CHECK (credit_account_number = '1000'),
  entry_date date NOT NULL,
  posted_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  posted_at timestamptz NOT NULL DEFAULT now(),
  storno_of_id uuid REFERENCES public.cash_bank_transfer_journals(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cash_bank_transfer_journals_one_live
  ON public.cash_bank_transfer_journals (deposit_id)
  WHERE storno_of_id IS NULL;

ALTER TABLE public.cash_bank_transfer_journals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cash_bank_transfer_journals_service_role ON public.cash_bank_transfer_journals;
CREATE POLICY cash_bank_transfer_journals_service_role ON public.cash_bank_transfer_journals
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

REVOKE ALL ON TABLE public.cash_bank_transfer_journals FROM PUBLIC;
REVOKE ALL ON TABLE public.cash_bank_transfer_journals FROM anon;
REVOKE ALL ON TABLE public.cash_bank_transfer_journals FROM authenticated;
GRANT SELECT, INSERT ON TABLE public.cash_bank_transfer_journals TO service_role;

CREATE TABLE IF NOT EXISTS public.cash_bank_transfer_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  journal_id uuid NOT NULL REFERENCES public.cash_bank_transfer_journals(id) ON DELETE RESTRICT,
  account_number text NOT NULL CHECK (account_number IN ('1020', '1000')),
  debit_rappen integer NOT NULL DEFAULT 0 CHECK (debit_rappen >= 0),
  credit_rappen integer NOT NULL DEFAULT 0 CHECK (credit_rappen >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cash_bank_transfer_lines_one_side_chk
    CHECK ((debit_rappen > 0 AND credit_rappen = 0) OR (credit_rappen > 0 AND debit_rappen = 0))
);

CREATE INDEX IF NOT EXISTS cash_bank_transfer_lines_journal_idx
  ON public.cash_bank_transfer_lines (journal_id);

ALTER TABLE public.cash_bank_transfer_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cash_bank_transfer_lines_service_role ON public.cash_bank_transfer_lines;
CREATE POLICY cash_bank_transfer_lines_service_role ON public.cash_bank_transfer_lines
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

REVOKE ALL ON TABLE public.cash_bank_transfer_lines FROM PUBLIC;
REVOKE ALL ON TABLE public.cash_bank_transfer_lines FROM anon;
REVOKE ALL ON TABLE public.cash_bank_transfer_lines FROM authenticated;
GRANT SELECT, INSERT ON TABLE public.cash_bank_transfer_lines TO service_role;

ALTER TABLE public.bank_import_records
  ADD COLUMN IF NOT EXISTS cash_deposit_report_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bank_import_records_cash_deposit_report_id_fkey'
  ) THEN
    ALTER TABLE public.bank_import_records
      ADD CONSTRAINT bank_import_records_cash_deposit_report_id_fkey
      FOREIGN KEY (cash_deposit_report_id) REFERENCES public.cash_deposit_reports(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS bank_import_records_one_cash_deposit
  ON public.bank_import_records (cash_deposit_report_id)
  WHERE cash_deposit_report_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cash_deposit_reports_bank_import_record_id_fkey'
  ) THEN
    ALTER TABLE public.cash_deposit_reports
      ADD CONSTRAINT cash_deposit_reports_bank_import_record_id_fkey
      FOREIGN KEY (bank_import_record_id) REFERENCES public.bank_import_records(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cash_deposit_reports_journal_id_fkey'
  ) THEN
    ALTER TABLE public.cash_deposit_reports
      ADD CONSTRAINT cash_deposit_reports_journal_id_fkey
      FOREIGN KEY (journal_id) REFERENCES public.cash_bank_transfer_journals(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.confirm_cash_bank_deposit(
  p_tenant_id uuid,
  p_actor_id uuid,
  p_deposit_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_dep public.cash_deposit_reports%ROWTYPE;
  v_actor_role text;
  v_import_id uuid;
  v_existing_deposit uuid;
  v_invoice_id uuid;
  v_accounting_entry_id uuid;
  v_journal_id uuid;
BEGIN
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_required';
  END IF;

  SELECT role INTO v_actor_role
  FROM public.users
  WHERE id = p_actor_id
    AND tenant_id = p_tenant_id
    AND deleted_at IS NULL
    AND is_active IS DISTINCT FROM false;

  IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'tenant_admin', 'super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_dep
  FROM public.cash_deposit_reports
  WHERE id = p_deposit_id
    AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'deposit_not_found';
  END IF;

  IF v_dep.status = 'reconciled' AND v_dep.journal_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'result', 'already_reconciled',
      'journal_id', v_dep.journal_id,
      'deposit_id', v_dep.id
    );
  END IF;

  IF v_dep.status <> 'matched'
    OR v_dep.candidate_dedupe_key IS NULL
    OR v_dep.candidate_match_class NOT IN ('exact', 'suggestion')
    OR v_dep.candidate_direction IS DISTINCT FROM 'credit'
    OR v_dep.currency <> 'CHF'
    OR v_dep.amount_rappen <= 0
    OR v_dep.candidate_amount_rappen IS DISTINCT FROM v_dep.amount_rappen THEN
    RAISE EXCEPTION 'not_confirmable';
  END IF;

  SELECT id, cash_deposit_report_id, invoice_id, accounting_entry_id
  INTO v_import_id, v_existing_deposit, v_invoice_id, v_accounting_entry_id
  FROM public.bank_import_records
  WHERE tenant_id = p_tenant_id
    AND dedupe_key = v_dep.candidate_dedupe_key
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing_deposit IS NOT NULL AND v_existing_deposit <> v_dep.id THEN
      RAISE EXCEPTION 'bank_line_used';
    END IF;
    IF v_invoice_id IS NOT NULL OR v_accounting_entry_id IS NOT NULL THEN
      RAISE EXCEPTION 'bank_line_used';
    END IF;
    UPDATE public.bank_import_records
    SET cash_deposit_report_id = v_dep.id
    WHERE id = v_import_id
      AND tenant_id = p_tenant_id;
  ELSE
    INSERT INTO public.bank_import_records (
      tenant_id, dedupe_key, bank_ref, entry_date, amount_rappen, reference,
      imported_by, source, cash_deposit_report_id
    ) VALUES (
      p_tenant_id,
      v_dep.candidate_dedupe_key,
      v_dep.candidate_bank_ref,
      COALESCE(v_dep.candidate_entry_date, v_dep.reported_on),
      v_dep.amount_rappen,
      v_dep.reference_token,
      p_actor_id,
      'cash_deposit',
      v_dep.id
    )
    RETURNING id INTO v_import_id;
  END IF;

  INSERT INTO public.cash_bank_transfer_journals (
    tenant_id, deposit_id, amount_rappen, debit_account_number, credit_account_number,
    entry_date, posted_by
  ) VALUES (
    p_tenant_id,
    v_dep.id,
    v_dep.amount_rappen,
    '1020',
    '1000',
    COALESCE(v_dep.candidate_entry_date, v_dep.reported_on),
    p_actor_id
  )
  RETURNING id INTO v_journal_id;

  INSERT INTO public.cash_bank_transfer_lines (
    tenant_id, journal_id, account_number, debit_rappen, credit_rappen
  ) VALUES
    (p_tenant_id, v_journal_id, '1020', v_dep.amount_rappen, 0),
    (p_tenant_id, v_journal_id, '1000', 0, v_dep.amount_rappen);

  UPDATE public.cash_deposit_reports
  SET status = 'reconciled',
      confirmed_by = p_actor_id,
      confirmed_at = now(),
      bank_import_record_id = v_import_id,
      journal_id = v_journal_id,
      attribution_status = CASE WHEN depositor_user_id IS NULL THEN 'unassigned' ELSE 'confirmed' END,
      attribution_confirmed_by = CASE WHEN depositor_user_id IS NULL THEN NULL ELSE p_actor_id END,
      attribution_confirmed_at = CASE WHEN depositor_user_id IS NULL THEN NULL ELSE now() END,
      updated_at = now()
  WHERE id = v_dep.id
    AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object(
    'result', 'reconciled',
    'journal_id', v_journal_id,
    'deposit_id', v_dep.id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_cash_bank_deposit(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_cash_bank_deposit(uuid, uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.confirm_cash_bank_deposit(uuid, uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_cash_bank_deposit(uuid, uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.confirm_cash_bank_deposit(uuid, uuid, uuid) IS
  'Posts one Dr 1020 / Cr 1000 transfer for a matched cash deposit. Does not post income or expense and does not change legacy cash or bank snapshots.';

CREATE OR REPLACE FUNCTION public.report_cash_bank_deposit(
  p_tenant_id uuid,
  p_actor_id uuid,
  p_idempotency_key text,
  p_source_kind text,
  p_source_user_id uuid,
  p_amount_rappen integer,
  p_reported_on date,
  p_depositor_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor_role text;
  v_source_role text;
  v_depositor_role text;
  v_key text;
  v_id uuid;
  v_token text;
  v_inserted uuid;
  v_existing public.cash_deposit_reports%ROWTYPE;
BEGIN
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_required';
  END IF;

  v_key := trim(COALESCE(p_idempotency_key, ''));
  IF length(v_key) < 8 OR length(v_key) > 80 THEN
    RAISE EXCEPTION 'idempotency';
  END IF;
  IF p_amount_rappen IS NULL OR p_amount_rappen <= 0 OR p_amount_rappen > 100000000 THEN
    RAISE EXCEPTION 'amount';
  END IF;
  IF p_reported_on IS NULL THEN
    RAISE EXCEPTION 'date';
  END IF;
  IF p_source_kind NOT IN ('business', 'staff', 'admin') THEN
    RAISE EXCEPTION 'invalid_source';
  END IF;

  SELECT role INTO v_actor_role
  FROM public.users
  WHERE id = p_actor_id
    AND tenant_id = p_tenant_id
    AND deleted_at IS NULL
    AND is_active IS DISTINCT FROM false;

  IF v_actor_role IS NULL OR v_actor_role NOT IN ('staff', 'admin', 'tenant_admin', 'super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_source_kind = 'business' THEN
    IF p_source_user_id IS NOT NULL THEN
      RAISE EXCEPTION 'invalid_source';
    END IF;
  ELSE
    SELECT role INTO v_source_role
    FROM public.users
    WHERE id = p_source_user_id
      AND tenant_id = p_tenant_id
      AND deleted_at IS NULL
      AND is_active IS DISTINCT FROM false;
    IF v_source_role IS NULL OR v_source_role NOT IN ('staff', 'admin', 'tenant_admin', 'super_admin') THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
    IF p_source_kind = 'admin' AND v_source_role = 'staff' THEN
      RAISE EXCEPTION 'invalid_source';
    END IF;
  END IF;

  IF v_actor_role = 'staff' THEN
    IF p_source_kind <> 'staff' OR p_source_user_id IS DISTINCT FROM p_actor_id THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
    IF p_depositor_user_id IS NOT NULL AND p_depositor_user_id IS DISTINCT FROM p_actor_id THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  ELSIF v_actor_role NOT IN ('admin', 'tenant_admin', 'super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_depositor_user_id IS NOT NULL THEN
    SELECT role INTO v_depositor_role
    FROM public.users
    WHERE id = p_depositor_user_id
      AND tenant_id = p_tenant_id
      AND deleted_at IS NULL
      AND is_active IS DISTINCT FROM false;
    IF v_depositor_role IS NULL OR v_depositor_role NOT IN ('staff', 'admin', 'tenant_admin', 'super_admin') THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  v_id := gen_random_uuid();
  v_token := 'SIMYDEP' || upper(substr(replace(v_id::text, '-', ''), 1, 8));

  INSERT INTO public.cash_deposit_reports (
    id, tenant_id, idempotency_key, source_kind, source_user_id,
    amount_rappen, currency, reported_on, reported_by, status, reference_token,
    depositor_user_id, attribution_status, attribution_updated_by, attribution_updated_at
  ) VALUES (
    v_id, p_tenant_id, v_key, p_source_kind, p_source_user_id,
    p_amount_rappen, 'CHF', p_reported_on, p_actor_id, 'reported', v_token,
    p_depositor_user_id,
    CASE WHEN p_depositor_user_id IS NULL THEN 'unassigned' ELSE 'reported' END,
    CASE WHEN p_depositor_user_id IS NULL THEN NULL ELSE p_actor_id END,
    CASE WHEN p_depositor_user_id IS NULL THEN NULL ELSE now() END
  )
  ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
  RETURNING id INTO v_inserted;

  IF v_inserted IS NULL THEN
    SELECT * INTO v_existing
    FROM public.cash_deposit_reports
    WHERE tenant_id = p_tenant_id
      AND idempotency_key = v_key;
    RETURN jsonb_build_object(
      'result', 'existing',
      'deposit_id', v_existing.id,
      'status', v_existing.status,
      'journal_id', v_existing.journal_id,
      'reference_token', v_existing.reference_token,
      'depositor_user_id', v_existing.depositor_user_id
    );
  END IF;

  IF p_depositor_user_id IS NOT NULL THEN
    INSERT INTO public.cash_deposit_attribution_events (
      tenant_id, deposit_id, previous_user_id, next_user_id, actor_id, kind, reason
    ) VALUES (
      p_tenant_id, v_inserted, NULL, p_depositor_user_id, p_actor_id, 'assign', NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'result', 'reported',
    'deposit_id', v_inserted,
    'status', 'reported',
    'journal_id', NULL,
    'reference_token', v_token,
    'depositor_user_id', p_depositor_user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.report_cash_bank_deposit(uuid, uuid, text, text, uuid, integer, date, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.report_cash_bank_deposit(uuid, uuid, text, text, uuid, integer, date, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.report_cash_bank_deposit(uuid, uuid, text, text, uuid, integer, date, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.report_cash_bank_deposit(uuid, uuid, text, text, uuid, integer, date, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.select_cash_bank_deposit_candidate(
  p_tenant_id uuid,
  p_actor_id uuid,
  p_deposit_id uuid,
  p_dedupe_key text,
  p_amount_rappen integer,
  p_entry_date date,
  p_direction text,
  p_match_class text,
  p_bank_ref text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor_role text;
  v_dep public.cash_deposit_reports%ROWTYPE;
BEGIN
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_required';
  END IF;

  SELECT role INTO v_actor_role
  FROM public.users
  WHERE id = p_actor_id
    AND tenant_id = p_tenant_id
    AND deleted_at IS NULL
    AND is_active IS DISTINCT FROM false;

  IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'tenant_admin', 'super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_dep
  FROM public.cash_deposit_reports
  WHERE id = p_deposit_id
    AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'deposit_not_found';
  END IF;

  IF v_dep.status NOT IN ('reported', 'matched')
    OR p_match_class NOT IN ('exact', 'suggestion')
    OR p_direction IS DISTINCT FROM 'credit'
    OR p_amount_rappen IS DISTINCT FROM v_dep.amount_rappen
    OR p_entry_date IS NULL
    OR p_dedupe_key IS NULL
    OR length(trim(p_dedupe_key)) < 4
  THEN
    RAISE EXCEPTION 'not_confirmable';
  END IF;

  UPDATE public.cash_deposit_reports
  SET status = 'matched',
      candidate_dedupe_key = trim(p_dedupe_key),
      candidate_amount_rappen = p_amount_rappen,
      candidate_entry_date = p_entry_date,
      candidate_direction = 'credit',
      candidate_match_class = p_match_class,
      candidate_bank_ref = left(NULLIF(trim(COALESCE(p_bank_ref, '')), ''), 120),
      updated_at = now()
  WHERE id = v_dep.id
    AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object(
    'result', 'matched',
    'deposit_id', v_dep.id,
    'journal_id', NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.select_cash_bank_deposit_candidate(uuid, uuid, uuid, text, integer, date, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.select_cash_bank_deposit_candidate(uuid, uuid, uuid, text, integer, date, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.select_cash_bank_deposit_candidate(uuid, uuid, uuid, text, integer, date, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.select_cash_bank_deposit_candidate(uuid, uuid, uuid, text, integer, date, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.apply_cash_deposit_attribution(
  p_tenant_id uuid,
  p_actor_id uuid,
  p_deposit_id uuid,
  p_next_user_id uuid,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor_role text;
  v_next_role text;
  v_dep public.cash_deposit_reports%ROWTYPE;
  v_reason text;
  v_kind text;
  v_status text;
BEGIN
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_required';
  END IF;

  SELECT role INTO v_actor_role
  FROM public.users
  WHERE id = p_actor_id
    AND tenant_id = p_tenant_id
    AND deleted_at IS NULL
    AND is_active IS DISTINCT FROM false;

  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_dep
  FROM public.cash_deposit_reports
  WHERE id = p_deposit_id
    AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'deposit_not_found';
  END IF;

  IF v_dep.status = 'cancelled' THEN
    RAISE EXCEPTION 'cancelled_locked';
  END IF;
  IF v_dep.depositor_user_id IS NOT DISTINCT FROM p_next_user_id THEN
    RAISE EXCEPTION 'unchanged';
  END IF;

  IF p_next_user_id IS NOT NULL THEN
    SELECT role INTO v_next_role
    FROM public.users
    WHERE id = p_next_user_id
      AND tenant_id = p_tenant_id
      AND deleted_at IS NULL
      AND is_active IS DISTINCT FROM false;
    IF v_next_role IS NULL OR v_next_role NOT IN ('staff', 'admin', 'tenant_admin', 'super_admin') THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  IF v_dep.status = 'reconciled' THEN
    IF v_actor_role NOT IN ('admin', 'tenant_admin', 'super_admin') THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
    v_reason := trim(COALESCE(p_reason, ''));
    IF length(v_reason) < 3 THEN
      RAISE EXCEPTION 'reason_required';
    END IF;
    v_kind := 'correction';
  ELSE
    v_reason := NULL;
    v_kind := 'assign';
    IF v_actor_role = 'staff' THEN
      IF v_dep.reported_by IS DISTINCT FROM p_actor_id THEN
        RAISE EXCEPTION 'forbidden';
      END IF;
      IF p_next_user_id IS NOT NULL AND p_next_user_id IS DISTINCT FROM p_actor_id THEN
        RAISE EXCEPTION 'forbidden';
      END IF;
    ELSIF v_actor_role NOT IN ('admin', 'tenant_admin', 'super_admin') THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  v_status := CASE WHEN p_next_user_id IS NULL THEN 'unassigned' WHEN v_dep.status = 'reconciled' THEN 'confirmed' ELSE 'reported' END;

  INSERT INTO public.cash_deposit_attribution_events (
    tenant_id, deposit_id, previous_user_id, next_user_id, actor_id, kind, reason
  ) VALUES (
    p_tenant_id, v_dep.id, v_dep.depositor_user_id, p_next_user_id, p_actor_id, v_kind, v_reason
  );

  UPDATE public.cash_deposit_reports
  SET depositor_user_id = p_next_user_id,
      attribution_status = v_status,
      attribution_updated_by = p_actor_id,
      attribution_updated_at = now(),
      updated_at = now()
  WHERE id = v_dep.id
    AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object(
    'result', v_kind,
    'deposit_id', v_dep.id,
    'journal_id', v_dep.journal_id,
    'previous_user_id', v_dep.depositor_user_id,
    'next_user_id', p_next_user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_cash_deposit_attribution(uuid, uuid, uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_cash_deposit_attribution(uuid, uuid, uuid, uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.apply_cash_deposit_attribution(uuid, uuid, uuid, uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_cash_deposit_attribution(uuid, uuid, uuid, uuid, text) TO service_role;

COMMENT ON FUNCTION public.apply_cash_deposit_attribution(uuid, uuid, uuid, uuid, text) IS
  'Changes the attributed depositor. A correction after reconciliation does not post, reverse, or change the transfer amount.';
