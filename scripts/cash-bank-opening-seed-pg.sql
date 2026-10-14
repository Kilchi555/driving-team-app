-- Disposable proof for the opening-bank seed. Not a production migration.
-- The transfer journals come from the versioned confirm and reverse functions.
-- The seed arithmetic matches openingBankSeedPlan in server/utils/accounting-ledger.ts:
--   unexplained = bank_balance_rappen - net live transfers
--   an existing opening-bank row is not updated
-- accounting_entries here has only the columns that seed writes.

CREATE TABLE IF NOT EXISTS public.accounting_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  number text NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  UNIQUE (tenant_id, number)
);

CREATE TABLE IF NOT EXISTS public.accounting_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  amount_rappen integer NOT NULL CHECK (amount_rappen > 0),
  entry_date date NOT NULL,
  description text NOT NULL,
  document_kind text,
  is_paid boolean,
  approval_status text,
  external_reference text,
  notes text,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.accounting_journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  entry_id uuid NOT NULL REFERENCES public.accounting_entries(id),
  account_id uuid NOT NULL REFERENCES public.accounting_accounts(id),
  debit_rappen integer NOT NULL CHECK (debit_rappen >= 0),
  credit_rappen integer NOT NULL CHECK (credit_rappen >= 0),
  CHECK ((debit_rappen > 0 AND credit_rappen = 0) OR (credit_rappen > 0 AND debit_rappen = 0))
);

INSERT INTO public.tenants (id, bank_balance_rappen) VALUES
  ('11111111-1111-4111-8111-111111111111', 50000),
  ('22222222-2222-4222-8222-222222222222', 40000),
  ('33333333-3333-4333-8333-333333333333', 70000),
  ('44444444-4444-4444-8444-444444444444', 20000);

INSERT INTO public.users (id, tenant_id, role) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'admin'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'admin'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '33333333-3333-4333-8333-333333333333', 'admin'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '44444444-4444-4444-8444-444444444444', 'admin');

INSERT INTO public.cash_balances (id, instructor_id, tenant_id, current_balance_rappen, office_cash_register_id, register_type) VALUES
  ('d1000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 100000, 'e1000000-0000-4000-8000-000000000001', 'office'),
  ('d1000000-0000-4000-8000-000000000011', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab', '11111111-1111-4111-8111-111111111111', 80000, NULL, 'instructor'),
  ('d2000000-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 80000, 'e2000000-0000-4000-8000-000000000002', 'office'),
  ('d3000000-0000-4000-8000-000000000003', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', '33333333-3333-4333-8333-333333333333', 90000, 'e3000000-0000-4000-8000-000000000003', 'office'),
  ('d4000000-0000-4000-8000-000000000004', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', '44444444-4444-4444-8444-444444444444', 30000, 'e4000000-0000-4000-8000-000000000004', 'office');

INSERT INTO public.accounting_accounts (tenant_id, number, name, type) VALUES
  ('11111111-1111-4111-8111-111111111111', '1020', 'Bank', 'asset'),
  ('11111111-1111-4111-8111-111111111111', '9000', 'Eröffnung', 'equity'),
  ('22222222-2222-4222-8222-222222222222', '1020', 'Bank', 'asset'),
  ('22222222-2222-4222-8222-222222222222', '9000', 'Eröffnung', 'equity'),
  ('33333333-3333-4333-8333-333333333333', '1020', 'Bank', 'asset'),
  ('33333333-3333-4333-8333-333333333333', '9000', 'Eröffnung', 'equity'),
  ('44444444-4444-4444-8444-444444444444', '1020', 'Bank', 'asset'),
  ('44444444-4444-4444-8444-444444444444', '9000', 'Eröffnung', 'equity');

INSERT INTO public.accounting_entries (
  id, tenant_id, type, amount_rappen, entry_date, description, document_kind, is_paid, approval_status, external_reference, notes
) VALUES (
  'c2000000-0000-4000-8000-000000000001',
  '22222222-2222-4222-8222-222222222222',
  'income', 40000, DATE '2026-01-01', 'Eröffnungsbilanz Bank', 'debtor', true, 'approved', 'opening-bank',
  'Bestehende Eröffnung'
);

CREATE OR REPLACE FUNCTION pg_temp.net_transfer(p_tenant uuid) RETURNS integer
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(CASE WHEN storno_of_id IS NULL THEN amount_rappen ELSE -amount_rappen END), 0)::integer
  FROM public.cash_bank_transfer_journals
  WHERE tenant_id = p_tenant
$$;

CREATE OR REPLACE FUNCTION pg_temp.apply_opening_seed(p_tenant uuid) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_bank integer;
  v_net integer;
  v_existing uuid;
  v_existing_amount integer;
  v_amount integer;
  v_entry uuid;
  v_bank_account uuid;
  v_equity uuid;
BEGIN
  SELECT bank_balance_rappen INTO v_bank FROM public.tenants WHERE id = p_tenant;
  SELECT id, amount_rappen INTO v_existing, v_existing_amount
  FROM public.accounting_entries
  WHERE tenant_id = p_tenant AND external_reference = 'opening-bank' AND deleted_at IS NULL
  ORDER BY id
  LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('action', 'skip', 'reason', 'already_seeded', 'amount_rappen', v_existing_amount);
  END IF;

  v_net := pg_temp.net_transfer(p_tenant);
  IF v_net < 0 OR v_bank < v_net THEN
    RAISE EXCEPTION 'transfer_ledger_inconsistent bank=% net=%', v_bank, v_net;
  END IF;
  v_amount := v_bank - v_net;
  IF v_amount = 0 THEN
    RETURN jsonb_build_object('action', 'skip', 'reason', 'no_unexplained_balance', 'amount_rappen', 0);
  END IF;

  SELECT id INTO v_bank_account FROM public.accounting_accounts WHERE tenant_id = p_tenant AND number = '1020';
  SELECT id INTO v_equity FROM public.accounting_accounts WHERE tenant_id = p_tenant AND number = '9000';
  INSERT INTO public.accounting_entries (
    tenant_id, type, amount_rappen, entry_date, description, document_kind, is_paid, approval_status, external_reference, notes
  ) VALUES (
    p_tenant, 'income', v_amount, DATE '2026-01-01', 'Eröffnungsbilanz Bank', 'debtor', true, 'approved', 'opening-bank',
    'Automatisch aus bisherigem Banksaldo ohne Kasse-an-Bank-Umbuchungen'
  ) RETURNING id INTO v_entry;
  INSERT INTO public.accounting_journal_lines (tenant_id, entry_id, account_id, debit_rappen, credit_rappen) VALUES
    (p_tenant, v_entry, v_bank_account, v_amount, 0),
    (p_tenant, v_entry, v_equity, 0, v_amount);
  RETURN jsonb_build_object('action', 'insert', 'amount_rappen', v_amount, 'entry_id', v_entry);
END $$;

CREATE OR REPLACE FUNCTION pg_temp.post_transfer(
  p_tenant uuid,
  p_actor uuid,
  p_key text,
  p_amount integer,
  p_date date,
  p_ref text
) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE
  v_report jsonb;
  v_batch jsonb;
  v_dep uuid;
  v_line uuid;
  v_confirm jsonb;
BEGIN
  v_report := public.report_cash_bank_deposit(p_tenant, p_actor, p_key, 'business', NULL, p_amount, p_date, NULL);
  v_dep := (v_report->>'deposit_id')::uuid;
  v_batch := public.persist_cash_bank_statement_lines(
    p_tenant, p_actor, 'csv',
    jsonb_build_array(jsonb_build_object(
      'dedupe_key', public.cash_bank_statement_dedupe_key(p_ref, p_date, p_amount, '', ''),
      'amount_rappen', p_amount,
      'currency', 'CHF',
      'direction', 'credit',
      'entry_date', p_date,
      'reference', '',
      'remittance', v_report->>'reference_token',
      'debtor_name', '',
      'bank_ref', p_ref
    ))
  );
  v_line := (v_batch->'lines'->0->>'statement_line_id')::uuid;
  IF v_line IS NULL THEN
    RAISE EXCEPTION 'statement line missing %', v_batch;
  END IF;
  PERFORM public.select_cash_bank_deposit_candidate(p_tenant, p_actor, v_dep, v_line);
  v_confirm := public.confirm_cash_bank_deposit(p_tenant, p_actor, v_dep);
  IF v_confirm->>'result' IS DISTINCT FROM 'reconciled' THEN
    RAISE EXCEPTION 'confirm failed %', v_confirm;
  END IF;
  RETURN v_dep;
END $$;

DO $$
DECLARE
  v_dep uuid;
  v_seed jsonb;
  v_again jsonb;
  v_reverse jsonb;
  v_income integer;
  v_rows integer;
  v_debit integer;
  v_credit integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY[
        'calculate_cash_balance',
        'update_cash_balance',
        'trigger_update_cash_balance',
        'trigger_update_cash_balance_from_movements'
      ])
  ) THEN
    RAISE EXCEPTION 'versioned migrations defined a cash-balance function this test cannot see';
  END IF;

  -- A. No opening entry. Transfer first, then seed.
  v_dep := pg_temp.post_transfer(
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'opening-seed-case-a', 10000, DATE '2026-10-02', 'SEED-A'
  );
  IF (SELECT current_balance_rappen FROM public.cash_balances WHERE id = 'd1000000-0000-4000-8000-000000000001') <> 90000 THEN
    RAISE EXCEPTION 'office drawer was not reduced once';
  END IF;
  IF (SELECT current_balance_rappen FROM public.cash_balances WHERE id = 'd1000000-0000-4000-8000-000000000011') <> 80000 THEN
    RAISE EXCEPTION 'other drawer changed';
  END IF;
  IF (SELECT bank_balance_rappen FROM public.tenants WHERE id = '11111111-1111-4111-8111-111111111111') <> 60000 THEN
    RAISE EXCEPTION 'bank did not increase by the transfer';
  END IF;
  IF (SELECT debit_account_number || '/' || credit_account_number FROM public.cash_bank_transfer_journals WHERE deposit_id = v_dep AND storno_of_id IS NULL) <> '1020/1000' THEN
    RAISE EXCEPTION 'transfer journal is not Dr 1020 / Cr 1000';
  END IF;
  IF pg_temp.net_transfer('11111111-1111-4111-8111-111111111111') <> 10000 THEN
    RAISE EXCEPTION 'tenant A net includes another tenant';
  END IF;

  v_seed := pg_temp.apply_opening_seed('11111111-1111-4111-8111-111111111111');
  IF v_seed->>'action' <> 'insert' OR (v_seed->>'amount_rappen')::integer <> 50000 THEN
    RAISE EXCEPTION 'case A seeded the transfer as income %', v_seed;
  END IF;
  SELECT COALESCE(SUM(debit_rappen), 0), COALESCE(SUM(credit_rappen), 0)
    INTO v_debit, v_credit
  FROM public.accounting_journal_lines
  WHERE entry_id = (v_seed->>'entry_id')::uuid;
  IF v_debit <> 50000 OR v_credit <> 50000 THEN
    RAISE EXCEPTION 'opening journal is unbalanced %/%', v_debit, v_credit;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.accounting_journal_lines l
    JOIN public.accounting_accounts a ON a.id = l.account_id
    WHERE l.entry_id = (v_seed->>'entry_id')::uuid AND a.number NOT IN ('1020', '9000')
  ) THEN
    RAISE EXCEPTION 'opening seed used an income or expense account';
  END IF;

  v_again := pg_temp.apply_opening_seed('11111111-1111-4111-8111-111111111111');
  IF v_again->>'action' <> 'skip' OR (v_again->>'amount_rappen')::integer <> 50000 THEN
    RAISE EXCEPTION 'repeated seed changed the opening %', v_again;
  END IF;
  SELECT count(*) INTO v_rows FROM public.accounting_entries
  WHERE tenant_id = '11111111-1111-4111-8111-111111111111' AND external_reference = 'opening-bank';
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'repeated seed inserted another opening row';
  END IF;

  -- C. Reversal after the seed. The opening amount stays at the pre-transfer bank.
  v_reverse := public.reverse_cash_bank_deposit(
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    v_dep,
    'Falsche Zuordnung'
  );
  IF v_reverse->>'result' <> 'reversed' THEN
    RAISE EXCEPTION 'reversal failed %', v_reverse;
  END IF;
  IF (SELECT current_balance_rappen FROM public.cash_balances WHERE id = 'd1000000-0000-4000-8000-000000000001') <> 100000 THEN
    RAISE EXCEPTION 'reversal did not restore the drawer';
  END IF;
  IF (SELECT bank_balance_rappen FROM public.tenants WHERE id = '11111111-1111-4111-8111-111111111111') <> 50000 THEN
    RAISE EXCEPTION 'reversal did not restore the bank';
  END IF;
  IF (SELECT debit_account_number || '/' || credit_account_number FROM public.cash_bank_transfer_journals WHERE id = (v_reverse->>'reversal_journal_id')::uuid) <> '1000/1020' THEN
    RAISE EXCEPTION 'storno is not Dr 1000 / Cr 1020';
  END IF;
  IF pg_temp.net_transfer('11111111-1111-4111-8111-111111111111') <> 0 THEN
    RAISE EXCEPTION 'reversed transfer still has a net bank effect';
  END IF;
  v_again := pg_temp.apply_opening_seed('11111111-1111-4111-8111-111111111111');
  SELECT amount_rappen INTO v_income FROM public.accounting_entries
  WHERE tenant_id = '11111111-1111-4111-8111-111111111111' AND external_reference = 'opening-bank' AND deleted_at IS NULL;
  IF v_again->>'action' <> 'skip' OR v_income <> 50000 THEN
    RAISE EXCEPTION 'sync after reversal rewrote the opening % / %', v_again, v_income;
  END IF;
  IF (SELECT count(*) FROM public.cash_bank_transfer_journals WHERE deposit_id = v_dep) <> 2 THEN
    RAISE EXCEPTION 'reversal did not keep the original journal';
  END IF;
END $$;

DO $$
DECLARE
  v_seed jsonb;
  v_amount integer;
  v_rows integer;
BEGIN
  -- B. Opening already exists. A later transfer must not change it.
  PERFORM pg_temp.post_transfer(
    '22222222-2222-4222-8222-222222222222',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'opening-seed-case-b', 5000, DATE '2026-10-03', 'SEED-B'
  );
  IF (SELECT bank_balance_rappen FROM public.tenants WHERE id = '22222222-2222-4222-8222-222222222222') <> 45000 THEN
    RAISE EXCEPTION 'case B bank was not increased';
  END IF;
  v_seed := pg_temp.apply_opening_seed('22222222-2222-4222-8222-222222222222');
  SELECT count(*), max(amount_rappen) INTO v_rows, v_amount
  FROM public.accounting_entries
  WHERE tenant_id = '22222222-2222-4222-8222-222222222222' AND external_reference = 'opening-bank' AND deleted_at IS NULL;
  IF v_seed->>'action' <> 'skip' OR v_rows <> 1 OR v_amount <> 40000 THEN
    RAISE EXCEPTION 'existing opening was rewritten % rows=% amount=%', v_seed, v_rows, v_amount;
  END IF;
  IF (SELECT notes FROM public.accounting_entries WHERE id = 'c2000000-0000-4000-8000-000000000001') <> 'Bestehende Eröffnung' THEN
    RAISE EXCEPTION 'existing opening notes were rewritten';
  END IF;
  v_seed := pg_temp.apply_opening_seed('22222222-2222-4222-8222-222222222222');
  IF v_seed->>'amount_rappen' <> '40000' THEN
    RAISE EXCEPTION 'second sync changed the existing opening';
  END IF;
END $$;

DO $$
DECLARE
  v_dep uuid;
  v_seed jsonb;
BEGIN
  -- C. Reverse before the first seed. Net transfers are zero, so the original bank is the opening.
  v_dep := pg_temp.post_transfer(
    '33333333-3333-4333-8333-333333333333',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'opening-seed-case-c', 8000, DATE '2026-10-04', 'SEED-C'
  );
  PERFORM public.reverse_cash_bank_deposit(
    '33333333-3333-4333-8333-333333333333',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    v_dep,
    'Vor der Eröffnung storniert'
  );
  IF (SELECT bank_balance_rappen FROM public.tenants WHERE id = '33333333-3333-4333-8333-333333333333') <> 70000 THEN
    RAISE EXCEPTION 'case C bank was not restored before the seed';
  END IF;
  v_seed := pg_temp.apply_opening_seed('33333333-3333-4333-8333-333333333333');
  IF v_seed->>'action' <> 'insert' OR (v_seed->>'amount_rappen')::integer <> 70000 THEN
    RAISE EXCEPTION 'case C booked the reversed transfer %', v_seed;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.accounting_entries
    WHERE tenant_id = '33333333-3333-4333-8333-333333333333'
      AND external_reference = 'opening-bank'
      AND amount_rappen = 8000
  ) THEN
    RAISE EXCEPTION 'reversed transfer was stored as its own income entry';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public._test_abort_transfer_journal()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('cash_bank.test_abort_journal', true) = 'on' THEN
    RAISE EXCEPTION 'forced_journal_failure';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER _test_abort_transfer_journal
  BEFORE INSERT ON public.cash_bank_transfer_journals
  FOR EACH ROW EXECUTE FUNCTION public._test_abort_transfer_journal();

DO $$
DECLARE
  v_report jsonb;
  v_batch jsonb;
  v_dep uuid;
  v_line uuid;
  v_failed boolean := false;
BEGIN
  v_report := public.report_cash_bank_deposit(
    '44444444-4444-4444-8444-444444444444',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'opening-seed-abort', 'business', NULL, 3000, DATE '2026-10-05', NULL
  );
  v_dep := (v_report->>'deposit_id')::uuid;
  v_batch := public.persist_cash_bank_statement_lines(
    '44444444-4444-4444-8444-444444444444',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'csv',
    jsonb_build_array(jsonb_build_object(
      'dedupe_key', public.cash_bank_statement_dedupe_key('SEED-ABORT', DATE '2026-10-05', 3000, '', ''),
      'amount_rappen', 3000, 'currency', 'CHF', 'direction', 'credit',
      'entry_date', '2026-10-05', 'reference', '', 'remittance', v_report->>'reference_token',
      'debtor_name', '', 'bank_ref', 'SEED-ABORT'
    ))
  );
  v_line := (v_batch->'lines'->0->>'statement_line_id')::uuid;
  PERFORM public.select_cash_bank_deposit_candidate(
    '44444444-4444-4444-8444-444444444444',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    v_dep, v_line
  );

  BEGIN
    PERFORM set_config('cash_bank.test_abort_journal', 'on', true);
    PERFORM public.confirm_cash_bank_deposit(
      '44444444-4444-4444-8444-444444444444',
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      v_dep
    );
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%forced_journal_failure%' THEN
      RAISE;
    END IF;
    v_failed := true;
  END;

  IF NOT v_failed THEN
    RAISE EXCEPTION 'confirm did not roll back';
  END IF;
  IF (SELECT current_balance_rappen FROM public.cash_balances WHERE id = 'd4000000-0000-4000-8000-000000000004') <> 30000 THEN
    RAISE EXCEPTION 'failed confirm changed the drawer';
  END IF;
  IF (SELECT bank_balance_rappen FROM public.tenants WHERE id = '44444444-4444-4444-8444-444444444444') <> 20000 THEN
    RAISE EXCEPTION 'failed confirm changed the bank';
  END IF;
  IF EXISTS (SELECT 1 FROM public.cash_bank_transfer_journals WHERE deposit_id = v_dep) THEN
    RAISE EXCEPTION 'failed confirm left a journal';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.bank_import_records
    WHERE tenant_id = '44444444-4444-4444-8444-444444444444' AND cash_deposit_report_id = v_dep
  ) THEN
    RAISE EXCEPTION 'failed confirm left a bank import row';
  END IF;
  IF (SELECT status FROM public.cash_deposit_reports WHERE id = v_dep) <> 'matched' THEN
    RAISE EXCEPTION 'failed confirm changed the deposit status';
  END IF;

  PERFORM set_config('cash_bank.test_abort_journal', 'off', true);
  IF (public.confirm_cash_bank_deposit(
    '44444444-4444-4444-8444-444444444444',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    v_dep
  )->>'result') IS DISTINCT FROM 'reconciled' THEN
    RAISE EXCEPTION 'confirm after rollback did not post';
  END IF;
  IF (SELECT current_balance_rappen FROM public.cash_balances WHERE id = 'd4000000-0000-4000-8000-000000000004') <> 27000 THEN
    RAISE EXCEPTION 'successful confirm did not reduce the drawer once';
  END IF;
  IF (SELECT bank_balance_rappen FROM public.tenants WHERE id = '44444444-4444-4444-8444-444444444444') <> 23000 THEN
    RAISE EXCEPTION 'successful confirm did not increase the bank once';
  END IF;
  IF (SELECT count(*) FROM public.cash_bank_transfer_journals WHERE deposit_id = v_dep AND storno_of_id IS NULL) <> 1 THEN
    RAISE EXCEPTION 'rollback retry posted more than one live journal';
  END IF;
END $$;

DROP TRIGGER _test_abort_transfer_journal ON public.cash_bank_transfer_journals;
DROP FUNCTION public._test_abort_transfer_journal();
