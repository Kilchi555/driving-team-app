-- Cash-to-bank critical remediation. Additive. Do not apply from application deploy.
--
-- A confirmed transfer, in one transaction:
--   1. links only a statement line stored before confirmation
--   2. reduces exactly one identified source drawer (cash_balances)
--   3. increases tenants.bank_balance_rappen
--   4. posts Dr 1020 / Cr 1000 (not income, not expense)
-- A storno posts the opposite lines and restores those two balances.
-- Original journal lines are not deleted. cash_transactions are not rewritten.
--
-- public.calculate_cash_balance is not in this repository. This migration does
-- not replace it. The explicit drawer update runs after any staff movement
-- insert so a later statement in the same transaction keeps the new snapshot.
-- A later out-of-band recalc of that missing function can still overwrite it.

-- Rollback before any reconciled row exists:
--   DROP FUNCTION IF EXISTS public.reverse_cash_bank_deposit(uuid, uuid, uuid, text);
--   DROP FUNCTION IF EXISTS public.confirm_cash_bank_deposit(uuid, uuid, uuid);
--   DROP FUNCTION IF EXISTS public.select_cash_bank_deposit_candidate(uuid, uuid, uuid, uuid);
--   DROP FUNCTION IF EXISTS public.persist_cash_bank_statement_lines(uuid, uuid, text, jsonb);
--   DROP FUNCTION IF EXISTS public.cash_bank_apply_bank_effect(uuid, integer, text);
--   DROP FUNCTION IF EXISTS public.cash_bank_apply_drawer_effect(uuid, uuid, text, uuid, integer, text, uuid);
--   DROP FUNCTION IF EXISTS public.cash_bank_lock_source_drawer(uuid, text, uuid);
--   DROP FUNCTION IF EXISTS public.cash_bank_statement_dedupe_key(text, date, integer, text, text);
-- After a journal exists, do not drop the journal tables. Call reverse_cash_bank_deposit.

CREATE TABLE IF NOT EXISTS public.cash_bank_statement_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  imported_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  source text NOT NULL CHECK (source IN ('csv', 'camt')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_bank_statement_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cash_bank_statement_batches_service_role ON public.cash_bank_statement_batches;
CREATE POLICY cash_bank_statement_batches_service_role ON public.cash_bank_statement_batches
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
REVOKE ALL ON TABLE public.cash_bank_statement_batches FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.cash_bank_statement_batches TO service_role;

CREATE TABLE IF NOT EXISTS public.cash_bank_statement_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  batch_id uuid NOT NULL REFERENCES public.cash_bank_statement_batches(id) ON DELETE RESTRICT,
  dedupe_key text NOT NULL,
  bank_ref text,
  entry_date date NOT NULL,
  amount_rappen integer NOT NULL CHECK (amount_rappen > 0 AND amount_rappen <= 100000000),
  currency text NOT NULL CHECK (currency = 'CHF'),
  direction text NOT NULL CHECK (direction IN ('credit', 'debit', 'reversal')),
  reference text,
  remittance text,
  debtor_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS cash_bank_statement_lines_tenant_idx
  ON public.cash_bank_statement_lines (tenant_id, entry_date);

ALTER TABLE public.cash_bank_statement_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cash_bank_statement_lines_service_role ON public.cash_bank_statement_lines;
CREATE POLICY cash_bank_statement_lines_service_role ON public.cash_bank_statement_lines
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
REVOKE ALL ON TABLE public.cash_bank_statement_lines FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.cash_bank_statement_lines TO service_role;

ALTER TABLE public.cash_deposit_reports
  ADD COLUMN IF NOT EXISTS statement_line_id uuid,
  ADD COLUMN IF NOT EXISTS reversal_journal_id uuid,
  ADD COLUMN IF NOT EXISTS reversed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reversed_by uuid,
  ADD COLUMN IF NOT EXISTS reversal_reason text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cash_deposit_reports_statement_line_id_fkey'
  ) THEN
    ALTER TABLE public.cash_deposit_reports
      ADD CONSTRAINT cash_deposit_reports_statement_line_id_fkey
      FOREIGN KEY (statement_line_id) REFERENCES public.cash_bank_statement_lines(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.cash_deposit_reports'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%''cancelled''%'
      AND pg_get_constraintdef(oid) LIKE '%''reconciled''%'
      AND pg_get_constraintdef(oid) NOT LIKE '%journal_id%'
      AND pg_get_constraintdef(oid) NOT LIKE '%reversed%'
  LOOP
    EXECUTE format('ALTER TABLE public.cash_deposit_reports DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.cash_deposit_reports DROP CONSTRAINT IF EXISTS cash_deposit_reports_status_check;
ALTER TABLE public.cash_deposit_reports
  ADD CONSTRAINT cash_deposit_reports_status_check
  CHECK (status IN ('reported', 'matched', 'reconciled', 'reversed', 'cancelled'));

ALTER TABLE public.cash_deposit_reports DROP CONSTRAINT IF EXISTS cash_deposit_reports_reconciled_chk;
ALTER TABLE public.cash_deposit_reports
  ADD CONSTRAINT cash_deposit_reports_reconciled_chk CHECK (
    status NOT IN ('reconciled', 'reversed')
    OR (journal_id IS NOT NULL AND bank_import_record_id IS NOT NULL AND statement_line_id IS NOT NULL)
  );

ALTER TABLE public.cash_deposit_reports DROP CONSTRAINT IF EXISTS cash_deposit_reports_reversed_chk;
ALTER TABLE public.cash_deposit_reports
  ADD CONSTRAINT cash_deposit_reports_reversed_chk CHECK (
    status <> 'reversed' OR reversal_journal_id IS NOT NULL
  );

CREATE UNIQUE INDEX IF NOT EXISTS cash_deposit_reports_open_fingerprint
  ON public.cash_deposit_reports (
    tenant_id,
    source_kind,
    COALESCE(source_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
    amount_rappen,
    reported_on,
    COALESCE(depositor_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE status IN ('reported', 'matched');

ALTER TABLE public.bank_import_records
  ADD COLUMN IF NOT EXISTS currency text;

ALTER TABLE public.cash_bank_transfer_journals
  ADD COLUMN IF NOT EXISTS cash_balance_id uuid,
  ADD COLUMN IF NOT EXISTS movement_id uuid,
  ADD COLUMN IF NOT EXISTS reversal_reason text;

ALTER TABLE public.cash_bank_transfer_journals
  DROP CONSTRAINT IF EXISTS cash_bank_transfer_journals_debit_account_number_check;
ALTER TABLE public.cash_bank_transfer_journals
  DROP CONSTRAINT IF EXISTS cash_bank_transfer_journals_credit_account_number_check;
ALTER TABLE public.cash_bank_transfer_journals
  DROP CONSTRAINT IF EXISTS cash_bank_transfer_journals_pair_chk;
ALTER TABLE public.cash_bank_transfer_journals
  ADD CONSTRAINT cash_bank_transfer_journals_pair_chk CHECK (
    (storno_of_id IS NULL AND debit_account_number = '1020' AND credit_account_number = '1000')
    OR (storno_of_id IS NOT NULL AND debit_account_number = '1000' AND credit_account_number = '1020')
  );

CREATE UNIQUE INDEX IF NOT EXISTS cash_bank_transfer_journals_one_storno
  ON public.cash_bank_transfer_journals (storno_of_id)
  WHERE storno_of_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cash_deposit_reports_reversal_journal_id_fkey'
  ) THEN
    ALTER TABLE public.cash_deposit_reports
      ADD CONSTRAINT cash_deposit_reports_reversal_journal_id_fkey
      FOREIGN KEY (reversal_journal_id) REFERENCES public.cash_bank_transfer_journals(id) ON DELETE RESTRICT;
  END IF;
END $$;

ALTER TABLE public.cash_movements DROP CONSTRAINT IF EXISTS cash_movements_movement_type_check;
ALTER TABLE public.cash_movements
  ADD CONSTRAINT cash_movements_movement_type_check
  CHECK (movement_type = ANY (ARRAY[
    'deposit'::text,
    'withdrawal'::text,
    'cash_transaction'::text,
    'adjustment'::text,
    'system_init'::text,
    'cash_handover'::text,
    'cash_to_bank'::text,
    'cash_to_bank_reversal'::text
  ]));

CREATE OR REPLACE FUNCTION public.cash_deposit_reports_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF OLD.status = 'cancelled' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'cancelled_locked';
  END IF;

  IF OLD.status = 'reconciled' AND NEW.status = 'reversed' THEN
    IF NEW.amount_rappen IS DISTINCT FROM OLD.amount_rappen
      OR NEW.currency IS DISTINCT FROM OLD.currency
      OR NEW.journal_id IS DISTINCT FROM OLD.journal_id
      OR NEW.bank_import_record_id IS DISTINCT FROM OLD.bank_import_record_id
      OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
      OR NEW.candidate_dedupe_key IS DISTINCT FROM OLD.candidate_dedupe_key
      OR NEW.reported_on IS DISTINCT FROM OLD.reported_on
      OR NEW.statement_line_id IS DISTINCT FROM OLD.statement_line_id
      OR NEW.reversal_journal_id IS NULL
    THEN
      RAISE EXCEPTION 'reconciled_locked';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'reconciled' THEN
    IF NEW.amount_rappen IS DISTINCT FROM OLD.amount_rappen
      OR NEW.currency IS DISTINCT FROM OLD.currency
      OR NEW.journal_id IS DISTINCT FROM OLD.journal_id
      OR NEW.bank_import_record_id IS DISTINCT FROM OLD.bank_import_record_id
      OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.candidate_dedupe_key IS DISTINCT FROM OLD.candidate_dedupe_key
      OR NEW.reported_on IS DISTINCT FROM OLD.reported_on
      OR NEW.statement_line_id IS DISTINCT FROM OLD.statement_line_id
      OR NEW.reversal_journal_id IS DISTINCT FROM OLD.reversal_journal_id
    THEN
      RAISE EXCEPTION 'reconciled_locked';
    END IF;
  END IF;

  IF OLD.status = 'reversed' THEN
    IF NEW.amount_rappen IS DISTINCT FROM OLD.amount_rappen
      OR NEW.currency IS DISTINCT FROM OLD.currency
      OR NEW.journal_id IS DISTINCT FROM OLD.journal_id
      OR NEW.bank_import_record_id IS DISTINCT FROM OLD.bank_import_record_id
      OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.candidate_dedupe_key IS DISTINCT FROM OLD.candidate_dedupe_key
      OR NEW.reported_on IS DISTINCT FROM OLD.reported_on
      OR NEW.statement_line_id IS DISTINCT FROM OLD.statement_line_id
      OR NEW.reversal_journal_id IS DISTINCT FROM OLD.reversal_journal_id
    THEN
      RAISE EXCEPTION 'reversed_locked';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cash_bank_statement_dedupe_key(
  p_bank_ref text,
  p_entry_date date,
  p_amount_rappen integer,
  p_reference text,
  p_debtor_name text
) RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
  SELECT CASE
    WHEN p_bank_ref IS NOT NULL AND p_bank_ref <> ''
      THEN 'ref:' || p_bank_ref
    ELSE 'fallback:' || to_char(p_entry_date, 'YYYY-MM-DD') || '|' || p_amount_rappen::text
      || '|' || COALESCE(p_reference, '') || '|' || lower(btrim(COALESCE(p_debtor_name, '')))
  END
$$;

REVOKE ALL ON FUNCTION public.cash_bank_statement_dedupe_key(text, date, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cash_bank_statement_dedupe_key(text, date, integer, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.cash_bank_lock_source_drawer(
  p_tenant_id uuid,
  p_source_kind text,
  p_source_user_id uuid
) RETURNS TABLE(balance_id uuid, balance_rappen integer, movement_kind text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_source_kind = 'business' THEN
    SELECT count(*) INTO v_count
    FROM public.cash_balances
    WHERE tenant_id = p_tenant_id
      AND office_cash_register_id IS NOT NULL
      AND register_type = 'office';
    IF v_count = 0 THEN RAISE EXCEPTION 'drawer_missing'; END IF;
    IF v_count > 1 THEN RAISE EXCEPTION 'drawer_ambiguous'; END IF;
    RETURN QUERY
    SELECT id, current_balance_rappen, 'office'::text
    FROM public.cash_balances
    WHERE tenant_id = p_tenant_id
      AND office_cash_register_id IS NOT NULL
      AND register_type = 'office'
    FOR UPDATE;
    RETURN;
  END IF;

  IF p_source_kind NOT IN ('staff', 'admin') OR p_source_user_id IS NULL THEN
    RAISE EXCEPTION 'drawer_missing';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.cash_balances
  WHERE tenant_id = p_tenant_id
    AND instructor_id = p_source_user_id
    AND office_cash_register_id IS NULL;
  IF v_count = 0 THEN RAISE EXCEPTION 'drawer_missing'; END IF;
  IF v_count > 1 THEN RAISE EXCEPTION 'drawer_ambiguous'; END IF;

  RETURN QUERY
  SELECT id, current_balance_rappen, 'staff'::text
  FROM public.cash_balances
  WHERE tenant_id = p_tenant_id
    AND instructor_id = p_source_user_id
    AND office_cash_register_id IS NULL
  FOR UPDATE;
END;
$$;

REVOKE ALL ON FUNCTION public.cash_bank_lock_source_drawer(uuid, text, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.cash_bank_apply_drawer_effect(
  p_tenant_id uuid,
  p_actor_id uuid,
  p_source_kind text,
  p_source_user_id uuid,
  p_amount integer,
  p_direction text,
  p_journal_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_drawer record;
  v_after integer;
  v_movement uuid;
  v_type text;
BEGIN
  IF p_direction NOT IN ('to_bank', 'to_cash') OR p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'amount';
  END IF;

  SELECT * INTO v_drawer
  FROM public.cash_bank_lock_source_drawer(p_tenant_id, p_source_kind, p_source_user_id);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'drawer_missing';
  END IF;

  IF p_direction = 'to_bank' THEN
    IF v_drawer.balance_rappen < p_amount THEN
      RAISE EXCEPTION 'insufficient_drawer';
    END IF;
    v_after := v_drawer.balance_rappen - p_amount;
    v_type := 'cash_to_bank';
  ELSE
    IF v_drawer.balance_rappen > 2147483647 - p_amount THEN
      RAISE EXCEPTION 'drawer_overflow';
    END IF;
    v_after := v_drawer.balance_rappen + p_amount;
    v_type := 'cash_to_bank_reversal';
  END IF;

  IF v_drawer.movement_kind = 'staff' THEN
    INSERT INTO public.cash_movements (
      instructor_id, tenant_id, movement_type, amount_rappen,
      balance_before_rappen, balance_after_rappen, reference_id, reference_type,
      performed_by, notes, office_cash_register_id, register_type
    ) VALUES (
      p_source_user_id, p_tenant_id, v_type, p_amount,
      v_drawer.balance_rappen, v_after, p_journal_id, 'cash_bank_transfer',
      p_actor_id,
      CASE WHEN p_direction = 'to_bank' THEN 'Bareinzahlung an die Bank' ELSE 'Storno Bareinzahlung an die Bank' END,
      NULL, 'instructor'
    )
    RETURNING id INTO v_movement;
  END IF;

  UPDATE public.cash_balances
  SET current_balance_rappen = v_after,
      last_updated = now(),
      updated_at = now()
  WHERE id = v_drawer.balance_id
    AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'drawer_missing';
  END IF;

  RETURN v_movement;
END;
$$;

REVOKE ALL ON FUNCTION public.cash_bank_apply_drawer_effect(uuid, uuid, text, uuid, integer, text, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.cash_bank_apply_bank_effect(
  p_tenant_id uuid,
  p_amount integer,
  p_direction text
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_bank integer;
  v_after integer;
BEGIN
  SELECT bank_balance_rappen INTO v_bank
  FROM public.tenants
  WHERE id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'tenant_required';
  END IF;
  IF p_direction = 'increase' THEN
    IF v_bank > 2147483647 - p_amount THEN
      RAISE EXCEPTION 'bank_overflow';
    END IF;
    v_after := v_bank + p_amount;
  ELSIF p_direction = 'decrease' THEN
    IF v_bank < p_amount THEN
      RAISE EXCEPTION 'bank_insufficient';
    END IF;
    v_after := v_bank - p_amount;
  ELSE
    RAISE EXCEPTION 'amount';
  END IF;

  UPDATE public.tenants
  SET bank_balance_rappen = v_after
  WHERE id = p_tenant_id;

  RETURN v_after;
END;
$$;

REVOKE ALL ON FUNCTION public.cash_bank_apply_bank_effect(uuid, integer, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.persist_cash_bank_statement_lines(
  p_tenant_id uuid,
  p_actor_id uuid,
  p_source text,
  p_lines jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor_role text;
  v_batch uuid;
  v_line jsonb;
  v_index integer := 0;
  v_results jsonb := '[]'::jsonb;
  v_count integer;
  v_currency text;
  v_direction text;
  v_amount integer;
  v_date date;
  v_reference text;
  v_remittance text;
  v_debtor text;
  v_bank_ref text;
  v_supplied text;
  v_expected text;
  v_line_id uuid;
  v_existing public.cash_bank_statement_lines%ROWTYPE;
  v_result text;
BEGIN
  IF p_tenant_id IS NULL OR p_source NOT IN ('csv', 'camt') OR jsonb_typeof(p_lines) <> 'array' THEN
    RAISE EXCEPTION 'invalid_source';
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

  v_count := jsonb_array_length(p_lines);
  IF v_count > 20000 THEN
    RAISE EXCEPTION 'incomplete_candidates';
  END IF;

  INSERT INTO public.cash_bank_statement_batches (tenant_id, imported_by, source)
  VALUES (p_tenant_id, p_actor_id, p_source)
  RETURNING id INTO v_batch;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines)
  LOOP
    v_line_id := NULL;
    v_result := 'invalid';
    BEGIN
      v_currency := upper(btrim(COALESCE(v_line->>'currency', '')));
      v_direction := lower(btrim(COALESCE(v_line->>'direction', '')));
      v_amount := (v_line->>'amount_rappen')::integer;
      v_date := (v_line->>'entry_date')::date;
      v_reference := COALESCE(v_line->>'reference', '');
      v_remittance := COALESCE(v_line->>'remittance', '');
      v_debtor := COALESCE(v_line->>'debtor_name', '');
      v_bank_ref := NULLIF(v_line->>'bank_ref', '');
      v_supplied := btrim(COALESCE(v_line->>'dedupe_key', ''));
      v_expected := public.cash_bank_statement_dedupe_key(v_bank_ref, v_date, v_amount, v_reference, v_debtor);

      IF v_currency <> 'CHF' THEN
        v_result := 'currency';
      ELSIF v_direction NOT IN ('credit', 'debit', 'reversal')
        OR v_amount IS NULL OR v_amount <= 0 OR v_amount > 100000000
        OR v_date IS NULL THEN
        v_result := 'invalid';
      ELSIF v_supplied = '' OR v_supplied IS DISTINCT FROM v_expected THEN
        v_result := 'forged_dedupe';
      ELSE
        INSERT INTO public.cash_bank_statement_lines (
          tenant_id, batch_id, dedupe_key, bank_ref, entry_date, amount_rappen,
          currency, direction, reference, remittance, debtor_name
        ) VALUES (
          p_tenant_id, v_batch, v_expected, v_bank_ref, v_date, v_amount,
          'CHF', v_direction, v_reference, v_remittance, v_debtor
        )
        ON CONFLICT (tenant_id, dedupe_key) DO NOTHING
        RETURNING id INTO v_line_id;

        IF v_line_id IS NULL THEN
          SELECT * INTO v_existing
          FROM public.cash_bank_statement_lines
          WHERE tenant_id = p_tenant_id AND dedupe_key = v_expected
          FOR UPDATE;
          IF v_existing.amount_rappen IS DISTINCT FROM v_amount
            OR v_existing.currency IS DISTINCT FROM 'CHF'
            OR v_existing.entry_date IS DISTINCT FROM v_date
            OR v_existing.direction IS DISTINCT FROM v_direction THEN
            v_result := 'bank_row_mismatch';
          ELSE
            v_line_id := v_existing.id;
            v_result := 'existing';
          END IF;
        ELSE
          v_result := 'persisted';
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_result := 'invalid';
      v_line_id := NULL;
    END;

    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'index', v_index,
      'result', v_result,
      'statement_line_id', v_line_id,
      'dedupe_key', v_supplied
    ));
    v_index := v_index + 1;
  END LOOP;

  RETURN jsonb_build_object('batch_id', v_batch, 'lines', v_results);
END;
$$;

REVOKE ALL ON FUNCTION public.persist_cash_bank_statement_lines(uuid, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.persist_cash_bank_statement_lines(uuid, uuid, text, jsonb) TO service_role;

DROP FUNCTION IF EXISTS public.select_cash_bank_deposit_candidate(uuid, uuid, uuid, text, integer, date, text, text, text);

CREATE OR REPLACE FUNCTION public.select_cash_bank_deposit_candidate(
  p_tenant_id uuid,
  p_actor_id uuid,
  p_deposit_id uuid,
  p_statement_line_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor_role text;
  v_dep public.cash_deposit_reports%ROWTYPE;
  v_line public.cash_bank_statement_lines%ROWTYPE;
  v_expected text;
  v_class text;
  v_haystack text;
  v_same integer;
BEGIN
  IF p_tenant_id IS NULL THEN RAISE EXCEPTION 'tenant_required'; END IF;

  SELECT role INTO v_actor_role
  FROM public.users
  WHERE id = p_actor_id AND tenant_id = p_tenant_id AND deleted_at IS NULL AND is_active IS DISTINCT FROM false;
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'tenant_admin', 'super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_dep
  FROM public.cash_deposit_reports
  WHERE id = p_deposit_id AND tenant_id = p_tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'deposit_not_found'; END IF;
  IF v_dep.status NOT IN ('reported', 'matched') THEN RAISE EXCEPTION 'not_confirmable'; END IF;

  SELECT * INTO v_line
  FROM public.cash_bank_statement_lines
  WHERE id = p_statement_line_id AND tenant_id = p_tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'statement_not_found'; END IF;

  v_expected := public.cash_bank_statement_dedupe_key(
    v_line.bank_ref, v_line.entry_date, v_line.amount_rappen, v_line.reference, v_line.debtor_name
  );
  IF v_expected IS DISTINCT FROM v_line.dedupe_key THEN RAISE EXCEPTION 'forged_dedupe'; END IF;
  IF v_line.currency <> 'CHF' THEN RAISE EXCEPTION 'currency'; END IF;
  IF v_line.direction IS DISTINCT FROM 'credit' THEN RAISE EXCEPTION 'not_credit'; END IF;
  IF v_line.amount_rappen IS DISTINCT FROM v_dep.amount_rappen THEN RAISE EXCEPTION 'amount'; END IF;
  IF abs(v_line.entry_date - v_dep.reported_on) > 7 THEN RAISE EXCEPTION 'date'; END IF;

  v_haystack := upper(COALESCE(v_line.reference, '') || ' ' || COALESCE(v_line.remittance, ''));
  IF position(upper(v_dep.reference_token) IN v_haystack) > 0 THEN
    v_class := 'exact';
  ELSE
    SELECT count(*) INTO v_same
    FROM public.cash_deposit_reports
    WHERE tenant_id = p_tenant_id
      AND status IN ('reported', 'matched')
      AND amount_rappen = v_dep.amount_rappen
      AND abs(reported_on - v_line.entry_date) <= 7;
    IF v_same = 1 THEN
      v_class := 'suggestion';
    ELSE
      RAISE EXCEPTION 'not_confirmable';
    END IF;
  END IF;

  UPDATE public.cash_deposit_reports
  SET status = 'matched',
      statement_line_id = v_line.id,
      candidate_dedupe_key = v_line.dedupe_key,
      candidate_amount_rappen = v_line.amount_rappen,
      candidate_entry_date = v_line.entry_date,
      candidate_direction = 'credit',
      candidate_match_class = v_class,
      candidate_bank_ref = left(NULLIF(btrim(COALESCE(v_line.bank_ref, '')), ''), 120),
      updated_at = now()
  WHERE id = v_dep.id AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object('result', 'matched', 'deposit_id', v_dep.id, 'match_class', v_class, 'journal_id', NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.select_cash_bank_deposit_candidate(uuid, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.select_cash_bank_deposit_candidate(uuid, uuid, uuid, uuid) TO service_role;

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
  v_line public.cash_bank_statement_lines%ROWTYPE;
  v_expected text;
  v_haystack text;
  v_import_id uuid;
  v_existing_deposit uuid;
  v_invoice_id uuid;
  v_accounting_entry_id uuid;
  v_row_amount bigint;
  v_row_date date;
  v_row_currency text;
  v_row_source text;
  v_journal_id uuid;
  v_movement uuid;
BEGIN
  IF p_tenant_id IS NULL THEN RAISE EXCEPTION 'tenant_required'; END IF;

  SELECT role INTO v_actor_role
  FROM public.users
  WHERE id = p_actor_id AND tenant_id = p_tenant_id AND deleted_at IS NULL AND is_active IS DISTINCT FROM false;
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'tenant_admin', 'super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_dep
  FROM public.cash_deposit_reports
  WHERE id = p_deposit_id AND tenant_id = p_tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'deposit_not_found'; END IF;

  IF v_dep.status = 'reconciled' AND v_dep.journal_id IS NOT NULL THEN
    RETURN jsonb_build_object('result', 'already_reconciled', 'journal_id', v_dep.journal_id, 'deposit_id', v_dep.id);
  END IF;
  IF v_dep.status = 'reversed' THEN RAISE EXCEPTION 'reversed'; END IF;
  IF v_dep.status <> 'matched' OR v_dep.statement_line_id IS NULL THEN
    RAISE EXCEPTION 'missing_statement_line';
  END IF;
  IF v_dep.currency <> 'CHF' OR v_dep.amount_rappen <= 0 THEN RAISE EXCEPTION 'not_confirmable'; END IF;

  SELECT * INTO v_line
  FROM public.cash_bank_statement_lines
  WHERE id = v_dep.statement_line_id AND tenant_id = p_tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'statement_not_found'; END IF;

  v_expected := public.cash_bank_statement_dedupe_key(
    v_line.bank_ref, v_line.entry_date, v_line.amount_rappen, v_line.reference, v_line.debtor_name
  );
  IF v_expected IS DISTINCT FROM v_line.dedupe_key THEN RAISE EXCEPTION 'forged_dedupe'; END IF;
  IF v_line.direction IS DISTINCT FROM 'credit' THEN RAISE EXCEPTION 'not_credit'; END IF;
  IF v_line.currency <> 'CHF' THEN RAISE EXCEPTION 'currency'; END IF;
  IF v_line.amount_rappen IS DISTINCT FROM v_dep.amount_rappen THEN RAISE EXCEPTION 'amount'; END IF;
  IF v_line.entry_date IS NULL OR abs(v_line.entry_date - v_dep.reported_on) > 7 THEN RAISE EXCEPTION 'date'; END IF;

  v_haystack := upper(COALESCE(v_line.reference, '') || ' ' || COALESCE(v_line.remittance, ''));
  IF position(upper(v_dep.reference_token) IN v_haystack) = 0 THEN
    RAISE EXCEPTION 'insufficient_evidence';
  END IF;

  SELECT id, cash_deposit_report_id, invoice_id, accounting_entry_id, amount_rappen, entry_date, currency, source
  INTO v_import_id, v_existing_deposit, v_invoice_id, v_accounting_entry_id, v_row_amount, v_row_date, v_row_currency, v_row_source
  FROM public.bank_import_records
  WHERE tenant_id = p_tenant_id AND dedupe_key = v_line.dedupe_key
  FOR UPDATE;

  IF FOUND THEN
    IF v_invoice_id IS NOT NULL OR v_accounting_entry_id IS NOT NULL THEN
      RAISE EXCEPTION 'bank_line_used';
    END IF;
    IF v_existing_deposit IS NOT NULL AND v_existing_deposit <> v_dep.id THEN
      RAISE EXCEPTION 'bank_line_used';
    END IF;
    IF v_row_amount IS DISTINCT FROM v_line.amount_rappen
      OR v_row_date IS DISTINCT FROM v_line.entry_date
      OR v_row_currency IS NULL
      OR upper(btrim(v_row_currency)) <> 'CHF' THEN
      RAISE EXCEPTION 'bank_row_mismatch';
    END IF;
    IF v_row_source IS DISTINCT FROM 'cash_statement' THEN
      RAISE EXCEPTION 'ordinary_payment';
    END IF;
    UPDATE public.bank_import_records
    SET cash_deposit_report_id = v_dep.id
    WHERE id = v_import_id AND tenant_id = p_tenant_id AND cash_deposit_report_id IS NULL;
  ELSE
    BEGIN
      INSERT INTO public.bank_import_records (
        tenant_id, dedupe_key, bank_ref, entry_date, amount_rappen, currency, reference,
        debtor_name, imported_by, source, cash_deposit_report_id
      ) VALUES (
        p_tenant_id, v_line.dedupe_key, v_line.bank_ref, v_line.entry_date, v_line.amount_rappen,
        v_line.currency, v_line.reference, v_line.debtor_name, p_actor_id, 'cash_statement', v_dep.id
      )
      RETURNING id INTO v_import_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id, cash_deposit_report_id, invoice_id, accounting_entry_id, amount_rappen, entry_date, currency, source
      INTO v_import_id, v_existing_deposit, v_invoice_id, v_accounting_entry_id, v_row_amount, v_row_date, v_row_currency, v_row_source
      FROM public.bank_import_records
      WHERE tenant_id = p_tenant_id AND dedupe_key = v_line.dedupe_key
      FOR UPDATE;
      IF v_invoice_id IS NOT NULL OR v_accounting_entry_id IS NOT NULL
        OR (v_existing_deposit IS NOT NULL AND v_existing_deposit <> v_dep.id) THEN
        RAISE EXCEPTION 'bank_line_used';
      END IF;
      IF v_row_amount IS DISTINCT FROM v_line.amount_rappen
        OR v_row_date IS DISTINCT FROM v_line.entry_date
        OR v_row_currency IS NULL
        OR upper(btrim(v_row_currency)) <> 'CHF' THEN
        RAISE EXCEPTION 'bank_row_mismatch';
      END IF;
      IF v_row_source IS DISTINCT FROM 'cash_statement' THEN
        RAISE EXCEPTION 'ordinary_payment';
      END IF;
      UPDATE public.bank_import_records
      SET cash_deposit_report_id = v_dep.id
      WHERE id = v_import_id AND tenant_id = p_tenant_id AND cash_deposit_report_id IS NULL;
    END;
  END IF;

  v_movement := public.cash_bank_apply_drawer_effect(
    p_tenant_id, p_actor_id, v_dep.source_kind, v_dep.source_user_id, v_dep.amount_rappen, 'to_bank', NULL
  );
  PERFORM public.cash_bank_apply_bank_effect(p_tenant_id, v_dep.amount_rappen, 'increase');

  INSERT INTO public.cash_bank_transfer_journals (
    tenant_id, deposit_id, amount_rappen, debit_account_number, credit_account_number,
    entry_date, posted_by, cash_balance_id, movement_id
  )
  SELECT p_tenant_id, v_dep.id, v_dep.amount_rappen, '1020', '1000', v_line.entry_date, p_actor_id, balance_id, v_movement
  FROM public.cash_bank_lock_source_drawer(p_tenant_id, v_dep.source_kind, v_dep.source_user_id)
  RETURNING id INTO v_journal_id;

  INSERT INTO public.cash_bank_transfer_lines (
    tenant_id, journal_id, account_number, debit_rappen, credit_rappen
  ) VALUES
    (p_tenant_id, v_journal_id, '1020', v_dep.amount_rappen, 0),
    (p_tenant_id, v_journal_id, '1000', 0, v_dep.amount_rappen);

  IF v_movement IS NOT NULL THEN
    UPDATE public.cash_movements
    SET reference_id = v_journal_id
    WHERE id = v_movement
      AND tenant_id = p_tenant_id;
  END IF;

  UPDATE public.cash_deposit_reports
  SET status = 'reconciled',
      confirmed_by = p_actor_id,
      confirmed_at = now(),
      bank_import_record_id = v_import_id,
      journal_id = v_journal_id,
      statement_line_id = v_line.id,
      attribution_status = CASE WHEN depositor_user_id IS NULL THEN 'unassigned' ELSE 'confirmed' END,
      attribution_confirmed_by = CASE WHEN depositor_user_id IS NULL THEN NULL ELSE p_actor_id END,
      attribution_confirmed_at = CASE WHEN depositor_user_id IS NULL THEN NULL ELSE now() END,
      updated_at = now()
  WHERE id = v_dep.id AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object('result', 'reconciled', 'journal_id', v_journal_id, 'deposit_id', v_dep.id);
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_cash_bank_deposit(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_cash_bank_deposit(uuid, uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.confirm_cash_bank_deposit(uuid, uuid, uuid) IS
  'Posts Dr 1020 / Cr 1000 for one persisted CHF credit, reduces the single source drawer, and increases the tenant bank balance. Does not post income or expense.';

CREATE OR REPLACE FUNCTION public.reverse_cash_bank_deposit(
  p_tenant_id uuid,
  p_actor_id uuid,
  p_deposit_id uuid,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor_role text;
  v_dep public.cash_deposit_reports%ROWTYPE;
  v_reason text;
  v_existing uuid;
  v_journal_id uuid;
  v_movement uuid;
  v_drawer uuid;
BEGIN
  IF p_tenant_id IS NULL THEN RAISE EXCEPTION 'tenant_required'; END IF;
  v_reason := btrim(COALESCE(p_reason, ''));
  IF length(v_reason) < 3 THEN RAISE EXCEPTION 'reason_required'; END IF;

  SELECT role INTO v_actor_role
  FROM public.users
  WHERE id = p_actor_id AND tenant_id = p_tenant_id AND deleted_at IS NULL AND is_active IS DISTINCT FROM false;
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'tenant_admin', 'super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_dep
  FROM public.cash_deposit_reports
  WHERE id = p_deposit_id AND tenant_id = p_tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'deposit_not_found'; END IF;

  IF v_dep.status = 'reversed' OR v_dep.reversal_journal_id IS NOT NULL THEN
    RETURN jsonb_build_object('result', 'already_reversed', 'journal_id', v_dep.journal_id, 'reversal_journal_id', v_dep.reversal_journal_id, 'deposit_id', v_dep.id);
  END IF;
  IF v_dep.status <> 'reconciled' OR v_dep.journal_id IS NULL THEN
    RAISE EXCEPTION 'not_reversible';
  END IF;

  SELECT id INTO v_existing
  FROM public.cash_bank_transfer_journals
  WHERE storno_of_id = v_dep.journal_id
  FOR UPDATE;
  IF FOUND THEN
    RAISE EXCEPTION 'already_reversed';
  END IF;

  PERFORM 1 FROM public.cash_bank_transfer_journals
  WHERE id = v_dep.journal_id AND tenant_id = p_tenant_id AND storno_of_id IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_reversible'; END IF;

  v_movement := public.cash_bank_apply_drawer_effect(
    p_tenant_id, p_actor_id, v_dep.source_kind, v_dep.source_user_id, v_dep.amount_rappen, 'to_cash', v_dep.journal_id
  );
  PERFORM public.cash_bank_apply_bank_effect(p_tenant_id, v_dep.amount_rappen, 'decrease');

  SELECT balance_id INTO v_drawer
  FROM public.cash_bank_lock_source_drawer(p_tenant_id, v_dep.source_kind, v_dep.source_user_id);

  INSERT INTO public.cash_bank_transfer_journals (
    tenant_id, deposit_id, amount_rappen, debit_account_number, credit_account_number,
    entry_date, posted_by, storno_of_id, cash_balance_id, movement_id, reversal_reason
  ) VALUES (
    p_tenant_id, v_dep.id, v_dep.amount_rappen, '1000', '1020',
    v_dep.reported_on, p_actor_id, v_dep.journal_id, v_drawer, v_movement, v_reason
  )
  RETURNING id INTO v_journal_id;

  INSERT INTO public.cash_bank_transfer_lines (
    tenant_id, journal_id, account_number, debit_rappen, credit_rappen
  ) VALUES
    (p_tenant_id, v_journal_id, '1000', v_dep.amount_rappen, 0),
    (p_tenant_id, v_journal_id, '1020', 0, v_dep.amount_rappen);

  UPDATE public.cash_deposit_reports
  SET status = 'reversed',
      reversal_journal_id = v_journal_id,
      reversed_at = now(),
      reversed_by = p_actor_id,
      reversal_reason = v_reason,
      updated_at = now()
  WHERE id = v_dep.id AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object(
    'result', 'reversed',
    'journal_id', v_dep.journal_id,
    'reversal_journal_id', v_journal_id,
    'deposit_id', v_dep.id
  );
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('result', 'already_reversed', 'journal_id', v_dep.journal_id, 'deposit_id', v_dep.id);
END;
$$;

REVOKE ALL ON FUNCTION public.reverse_cash_bank_deposit(uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_cash_bank_deposit(uuid, uuid, uuid, text) TO service_role;

COMMENT ON FUNCTION public.reverse_cash_bank_deposit(uuid, uuid, uuid, text) IS
  'Posts the opposite Dr 1000 / Cr 1020 transfer and restores the source drawer and bank balance. The original journal stays.';

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
  v_attempt integer := 0;
  v_constraint text;
BEGIN
  IF p_tenant_id IS NULL THEN RAISE EXCEPTION 'tenant_required'; END IF;
  v_key := btrim(COALESCE(p_idempotency_key, ''));
  IF length(v_key) < 8 OR length(v_key) > 180 THEN RAISE EXCEPTION 'idempotency'; END IF;
  IF p_amount_rappen IS NULL OR p_amount_rappen <= 0 OR p_amount_rappen > 100000000 THEN RAISE EXCEPTION 'amount'; END IF;
  IF p_reported_on IS NULL THEN RAISE EXCEPTION 'date'; END IF;
  IF p_source_kind NOT IN ('business', 'staff', 'admin') THEN RAISE EXCEPTION 'invalid_source'; END IF;

  SELECT role INTO v_actor_role
  FROM public.users
  WHERE id = p_actor_id AND tenant_id = p_tenant_id AND deleted_at IS NULL AND is_active IS DISTINCT FROM false;
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('staff', 'admin', 'tenant_admin', 'super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_source_kind = 'business' THEN
    IF p_source_user_id IS NOT NULL THEN RAISE EXCEPTION 'invalid_source'; END IF;
  ELSE
    SELECT role INTO v_source_role
    FROM public.users
    WHERE id = p_source_user_id AND tenant_id = p_tenant_id AND deleted_at IS NULL AND is_active IS DISTINCT FROM false;
    IF v_source_role IS NULL OR v_source_role NOT IN ('staff', 'admin', 'tenant_admin', 'super_admin') THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
    IF p_source_kind = 'admin' AND v_source_role = 'staff' THEN RAISE EXCEPTION 'invalid_source'; END IF;
  END IF;

  IF v_actor_role = 'staff' THEN
    IF p_source_kind <> 'staff' OR p_source_user_id IS DISTINCT FROM p_actor_id THEN RAISE EXCEPTION 'forbidden'; END IF;
    IF p_depositor_user_id IS NOT NULL AND p_depositor_user_id IS DISTINCT FROM p_actor_id THEN RAISE EXCEPTION 'forbidden'; END IF;
  ELSIF v_actor_role NOT IN ('admin', 'tenant_admin', 'super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_depositor_user_id IS NOT NULL THEN
    SELECT role INTO v_depositor_role
    FROM public.users
    WHERE id = p_depositor_user_id AND tenant_id = p_tenant_id AND deleted_at IS NULL AND is_active IS DISTINCT FROM false;
    IF v_depositor_role IS NULL OR v_depositor_role NOT IN ('staff', 'admin', 'tenant_admin', 'super_admin') THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  SELECT * INTO v_existing
  FROM public.cash_deposit_reports
  WHERE tenant_id = p_tenant_id AND idempotency_key = v_key
  FOR UPDATE;
  IF FOUND THEN
    IF v_existing.amount_rappen IS DISTINCT FROM p_amount_rappen
      OR v_existing.reported_on IS DISTINCT FROM p_reported_on
      OR v_existing.source_kind IS DISTINCT FROM p_source_kind
      OR v_existing.source_user_id IS DISTINCT FROM p_source_user_id
      OR v_existing.depositor_user_id IS DISTINCT FROM p_depositor_user_id THEN
      RAISE EXCEPTION 'idempotency_conflict';
    END IF;
    RETURN jsonb_build_object(
      'result', 'existing', 'deposit_id', v_existing.id, 'status', v_existing.status,
      'journal_id', v_existing.journal_id, 'reference_token', v_existing.reference_token,
      'depositor_user_id', v_existing.depositor_user_id
    );
  END IF;

  SELECT * INTO v_existing
  FROM public.cash_deposit_reports
  WHERE tenant_id = p_tenant_id
    AND source_kind = p_source_kind
    AND source_user_id IS NOT DISTINCT FROM p_source_user_id
    AND amount_rappen = p_amount_rappen
    AND reported_on = p_reported_on
    AND depositor_user_id IS NOT DISTINCT FROM p_depositor_user_id
    AND status IN ('reported', 'matched')
  FOR UPDATE;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'result', 'existing', 'deposit_id', v_existing.id, 'status', v_existing.status,
      'journal_id', v_existing.journal_id, 'reference_token', v_existing.reference_token,
      'depositor_user_id', v_existing.depositor_user_id
    );
  END IF;

  LOOP
    v_attempt := v_attempt + 1;
    IF v_attempt > 5 THEN RAISE EXCEPTION 'token_collision'; END IF;
    v_id := gen_random_uuid();
    v_token := 'SIMYDEP' || upper(substr(replace(v_id::text, '-', ''), 1, 8));
    BEGIN
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
      RETURNING id INTO v_inserted;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
      IF v_constraint = 'cash_deposit_reports_tenant_id_reference_token_key' THEN
        CONTINUE;
      ELSIF v_constraint IN ('cash_deposit_reports_tenant_id_idempotency_key_key', 'cash_deposit_reports_open_fingerprint') THEN
        SELECT * INTO v_existing
        FROM public.cash_deposit_reports
        WHERE tenant_id = p_tenant_id
          AND (
            idempotency_key = v_key
            OR (
              source_kind = p_source_kind
              AND source_user_id IS NOT DISTINCT FROM p_source_user_id
              AND amount_rappen = p_amount_rappen
              AND reported_on = p_reported_on
              AND depositor_user_id IS NOT DISTINCT FROM p_depositor_user_id
              AND status IN ('reported', 'matched')
            )
          )
        ORDER BY created_at
        LIMIT 1;
        IF v_existing.id IS NULL THEN RAISE; END IF;
        IF v_existing.amount_rappen IS DISTINCT FROM p_amount_rappen
          OR v_existing.reported_on IS DISTINCT FROM p_reported_on
          OR v_existing.source_kind IS DISTINCT FROM p_source_kind
          OR v_existing.source_user_id IS DISTINCT FROM p_source_user_id
          OR v_existing.depositor_user_id IS DISTINCT FROM p_depositor_user_id THEN
          RAISE EXCEPTION 'idempotency_conflict';
        END IF;
        RETURN jsonb_build_object(
          'result', 'existing', 'deposit_id', v_existing.id, 'status', v_existing.status,
          'journal_id', v_existing.journal_id, 'reference_token', v_existing.reference_token,
          'depositor_user_id', v_existing.depositor_user_id
        );
      ELSE
        RAISE;
      END IF;
    END;
  END LOOP;

  IF p_depositor_user_id IS NOT NULL THEN
    INSERT INTO public.cash_deposit_attribution_events (
      tenant_id, deposit_id, previous_user_id, next_user_id, actor_id, kind, reason
    ) VALUES (
      p_tenant_id, v_inserted, NULL, p_depositor_user_id, p_actor_id, 'assign', NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'result', 'reported', 'deposit_id', v_inserted, 'status', 'reported',
    'journal_id', NULL, 'reference_token', v_token, 'depositor_user_id', p_depositor_user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.report_cash_bank_deposit(uuid, uuid, text, text, uuid, integer, date, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.report_cash_bank_deposit(uuid, uuid, text, text, uuid, integer, date, uuid) TO service_role;

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
  IF p_tenant_id IS NULL THEN RAISE EXCEPTION 'tenant_required'; END IF;

  SELECT role INTO v_actor_role
  FROM public.users
  WHERE id = p_actor_id AND tenant_id = p_tenant_id AND deleted_at IS NULL AND is_active IS DISTINCT FROM false;
  IF v_actor_role IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT * INTO v_dep
  FROM public.cash_deposit_reports
  WHERE id = p_deposit_id AND tenant_id = p_tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'deposit_not_found'; END IF;
  IF v_dep.status = 'cancelled' THEN RAISE EXCEPTION 'cancelled_locked'; END IF;
  IF v_dep.depositor_user_id IS NOT DISTINCT FROM p_next_user_id THEN RAISE EXCEPTION 'unchanged'; END IF;

  IF p_next_user_id IS NOT NULL THEN
    SELECT role INTO v_next_role
    FROM public.users
    WHERE id = p_next_user_id AND tenant_id = p_tenant_id AND deleted_at IS NULL AND is_active IS DISTINCT FROM false;
    IF v_next_role IS NULL OR v_next_role NOT IN ('staff', 'admin', 'tenant_admin', 'super_admin') THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  IF v_dep.status IN ('reconciled', 'reversed') THEN
    IF v_actor_role NOT IN ('admin', 'tenant_admin', 'super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
    v_reason := btrim(COALESCE(p_reason, ''));
    IF length(v_reason) < 3 THEN RAISE EXCEPTION 'reason_required'; END IF;
    v_kind := 'correction';
  ELSE
    v_reason := NULL;
    v_kind := 'assign';
    IF v_actor_role = 'staff' THEN
      IF v_dep.reported_by IS DISTINCT FROM p_actor_id THEN RAISE EXCEPTION 'forbidden'; END IF;
      IF p_next_user_id IS NOT NULL AND p_next_user_id IS DISTINCT FROM p_actor_id THEN RAISE EXCEPTION 'forbidden'; END IF;
    ELSIF v_actor_role NOT IN ('admin', 'tenant_admin', 'super_admin') THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  v_status := CASE
    WHEN p_next_user_id IS NULL THEN 'unassigned'
    WHEN v_dep.status IN ('reconciled', 'reversed') THEN 'confirmed'
    ELSE 'reported'
  END;

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
  WHERE id = v_dep.id AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object(
    'result', v_kind, 'deposit_id', v_dep.id, 'journal_id', v_dep.journal_id,
    'previous_user_id', v_dep.depositor_user_id, 'next_user_id', p_next_user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_cash_deposit_attribution(uuid, uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_cash_deposit_attribution(uuid, uuid, uuid, uuid, text) TO service_role;
