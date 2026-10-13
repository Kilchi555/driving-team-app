-- Sequential checks against the disposable database. Failures raise.
\set ON_ERROR_STOP on

INSERT INTO public.tenants (id, bank_balance_rappen) VALUES
  ('11111111-1111-4111-8111-111111111111', 50000),
  ('22222222-2222-4222-8222-222222222222', 1000);

INSERT INTO public.users (id, tenant_id, role) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'admin'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', 'staff'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '22222222-2222-4222-8222-222222222222', 'admin');

INSERT INTO public.cash_balances (id, instructor_id, tenant_id, current_balance_rappen, office_cash_register_id, register_type) VALUES
  ('d1000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 100000, 'e1000000-0000-4000-8000-000000000001', 'office'),
  ('d2000000-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', 80000, NULL, 'instructor');

DO $$
DECLARE
  v_tenant uuid := '11111111-1111-4111-8111-111111111111';
  v_other uuid := '22222222-2222-4222-8222-222222222222';
  v_admin uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  v_staff uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  v_other_admin uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  v_report jsonb;
  v_deposit uuid;
  v_token text;
  v_batch jsonb;
  v_line uuid;
  v_confirm jsonb;
  v_reverse jsonb;
  v_cash integer;
  v_bank integer;
  v_lines integer;
  v_debit integer;
  v_credit integer;
  v_key text;
BEGIN
  v_report := public.report_cash_bank_deposit(v_tenant, v_admin, 'business-key-10000-2026-10-01', 'business', NULL, 10000, DATE '2026-10-01', NULL);
  IF v_report->>'result' <> 'reported' THEN RAISE EXCEPTION 'report failed %', v_report; END IF;
  v_deposit := (v_report->>'deposit_id')::uuid;
  v_token := v_report->>'reference_token';

  v_report := public.report_cash_bank_deposit(v_tenant, v_admin, 'another-client-key-same-op', 'business', NULL, 10000, DATE '2026-10-01', NULL);
  IF v_report->>'result' <> 'existing' OR (v_report->>'deposit_id')::uuid <> v_deposit THEN
    RAISE EXCEPTION 'business idempotency failed %', v_report;
  END IF;

  BEGIN
    PERFORM public.report_cash_bank_deposit(v_tenant, v_admin, 'business-key-10000-2026-10-01', 'business', NULL, 20000, DATE '2026-10-01', NULL);
    RAISE EXCEPTION 'idempotency conflict was accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%idempotency_conflict%' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.confirm_cash_bank_deposit(v_tenant, v_admin, v_deposit);
    RAISE EXCEPTION 'confirm without a statement line was accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%missing_statement_line%' THEN RAISE; END IF;
  END;

  v_key := public.cash_bank_statement_dedupe_key('CASH-FORGED', DATE '2026-10-02', 10000, '', '');
  v_batch := public.persist_cash_bank_statement_lines(v_tenant, v_admin, 'csv', jsonb_build_array(
    jsonb_build_object('dedupe_key', 'ref:NOT-THE-LINE', 'amount_rappen', 10000, 'currency', 'CHF', 'direction', 'credit', 'entry_date', '2026-10-02', 'reference', '', 'remittance', v_token, 'debtor_name', '', 'bank_ref', 'CASH-FORGED')
  ));
  IF v_batch->'lines'->0->>'result' <> 'forged_dedupe' THEN RAISE EXCEPTION 'forged key stored %', v_batch; END IF;
  IF EXISTS (SELECT 1 FROM public.cash_bank_statement_lines WHERE dedupe_key = 'ref:NOT-THE-LINE') THEN
    RAISE EXCEPTION 'forged line was inserted';
  END IF;

  v_batch := public.persist_cash_bank_statement_lines(v_tenant, v_admin, 'csv', jsonb_build_array(
    jsonb_build_object('dedupe_key', 'fallback:2026-10-02|10000||', 'amount_rappen', 10000, 'currency', 'EUR', 'direction', 'credit', 'entry_date', '2026-10-02', 'reference', '', 'remittance', v_token, 'debtor_name', '', 'bank_ref', '')
  ));
  IF v_batch->'lines'->0->>'result' <> 'currency' THEN RAISE EXCEPTION 'EUR was accepted %', v_batch; END IF;
  IF EXISTS (SELECT 1 FROM public.cash_bank_statement_lines WHERE currency <> 'CHF') THEN
    RAISE EXCEPTION 'non-CHF line stored';
  END IF;

  v_key := public.cash_bank_statement_dedupe_key('CASH-OK', DATE '2026-10-02', 10000, 'Bancomat', 'Max Muster');
  v_batch := public.persist_cash_bank_statement_lines(v_tenant, v_admin, 'camt', jsonb_build_array(
    jsonb_build_object('dedupe_key', v_key, 'amount_rappen', 10000, 'currency', 'CHF', 'direction', 'credit', 'entry_date', '2026-10-02', 'reference', 'Bancomat', 'remittance', v_token, 'debtor_name', 'Max Muster', 'bank_ref', 'CASH-OK')
  ));
  IF v_batch->'lines'->0->>'result' <> 'persisted' THEN RAISE EXCEPTION 'persist failed %', v_batch; END IF;
  v_line := (v_batch->'lines'->0->>'statement_line_id')::uuid;

  BEGIN
    PERFORM public.select_cash_bank_deposit_candidate(v_other, v_other_admin, v_deposit, v_line);
    RAISE EXCEPTION 'cross-tenant select was accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%deposit_not_found%' AND SQLERRM NOT LIKE '%statement_not_found%' AND SQLERRM NOT LIKE '%forbidden%' THEN
      RAISE;
    END IF;
  END;

  PERFORM public.select_cash_bank_deposit_candidate(v_tenant, v_admin, v_deposit, v_line);

  INSERT INTO public.bank_import_records (
    tenant_id, dedupe_key, entry_date, amount_rappen, currency, source, invoice_id
  ) VALUES (
    v_tenant, v_key, DATE '2026-10-02', 10000, 'CHF', 'camt', '99999999-9999-4999-8999-999999999999'
  );

  BEGIN
    PERFORM public.confirm_cash_bank_deposit(v_tenant, v_admin, v_deposit);
    RAISE EXCEPTION 'invoice line was claimed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%bank_line_used%' THEN RAISE; END IF;
  END;
  IF (SELECT current_balance_rappen FROM public.cash_balances WHERE id = 'd1000000-0000-4000-8000-000000000001') <> 100000 THEN
    RAISE EXCEPTION 'drawer changed after rejected confirm';
  END IF;
  DELETE FROM public.bank_import_records WHERE dedupe_key = v_key;

  INSERT INTO public.bank_import_records (
    tenant_id, dedupe_key, entry_date, amount_rappen, currency, source, accounting_entry_id
  ) VALUES (
    v_tenant, v_key, DATE '2026-10-02', 10000, 'CHF', 'camt', '88888888-8888-4888-8888-888888888888'
  );
  BEGIN
    PERFORM public.confirm_cash_bank_deposit(v_tenant, v_admin, v_deposit);
    RAISE EXCEPTION 'expense line was claimed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%bank_line_used%' THEN RAISE; END IF;
  END;
  DELETE FROM public.bank_import_records WHERE dedupe_key = v_key;

  INSERT INTO public.bank_import_records (
    tenant_id, dedupe_key, entry_date, amount_rappen, currency, source
  ) VALUES (
    v_tenant, v_key, DATE '2026-10-02', 9000, 'CHF', 'cash_statement'
  );
  BEGIN
    PERFORM public.confirm_cash_bank_deposit(v_tenant, v_admin, v_deposit);
    RAISE EXCEPTION 'mismatched bank amount was accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%bank_row_mismatch%' THEN RAISE; END IF;
  END;
  DELETE FROM public.bank_import_records WHERE dedupe_key = v_key;

  INSERT INTO public.bank_import_records (
    tenant_id, dedupe_key, entry_date, amount_rappen, source
  ) VALUES (
    v_tenant, v_key, DATE '2026-10-02', 10000, 'cash_statement'
  );
  BEGIN
    PERFORM public.confirm_cash_bank_deposit(v_tenant, v_admin, v_deposit);
    RAISE EXCEPTION 'null currency was treated as CHF';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%bank_row_mismatch%' THEN RAISE; END IF;
  END;
  DELETE FROM public.bank_import_records WHERE dedupe_key = v_key;

  v_confirm := public.confirm_cash_bank_deposit(v_tenant, v_admin, v_deposit);
  IF v_confirm->>'result' <> 'reconciled' THEN RAISE EXCEPTION 'confirm failed %', v_confirm; END IF;
  v_confirm := public.confirm_cash_bank_deposit(v_tenant, v_admin, v_deposit);
  IF v_confirm->>'result' <> 'already_reconciled' THEN RAISE EXCEPTION 'repeat confirm failed %', v_confirm; END IF;

  SELECT current_balance_rappen INTO v_cash FROM public.cash_balances WHERE id = 'd1000000-0000-4000-8000-000000000001';
  SELECT bank_balance_rappen INTO v_bank FROM public.tenants WHERE id = v_tenant;
  IF v_cash <> 90000 OR v_bank <> 60000 THEN
    RAISE EXCEPTION 'balances after confirm cash % bank %', v_cash, v_bank;
  END IF;
  IF (SELECT current_balance_rappen FROM public.cash_balances WHERE id = 'd2000000-0000-4000-8000-000000000002') <> 80000 THEN
    RAISE EXCEPTION 'staff drawer was touched by an office deposit';
  END IF;
  IF EXISTS (SELECT 1 FROM public.cash_movements WHERE movement_type = 'cash_to_bank') THEN
    RAISE EXCEPTION 'office confirm wrote a staff movement';
  END IF;

  SELECT count(*), COALESCE(sum(debit_rappen), 0), COALESCE(sum(credit_rappen), 0)
  INTO v_lines, v_debit, v_credit
  FROM public.cash_bank_transfer_lines
  WHERE journal_id = (v_confirm->>'journal_id')::uuid;
  IF v_lines <> 2 OR v_debit <> 10000 OR v_credit <> 10000 THEN
    RAISE EXCEPTION 'journal not balanced % % %', v_lines, v_debit, v_credit;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.cash_bank_transfer_lines
    WHERE account_number NOT IN ('1000', '1020')
  ) THEN
    RAISE EXCEPTION 'profit and loss account used';
  END IF;
  IF (SELECT source FROM public.bank_import_records WHERE dedupe_key = v_key) <> 'cash_statement' THEN
    RAISE EXCEPTION 'bank row was not taken from the statement';
  END IF;
  IF (SELECT amount_rappen FROM public.bank_import_records WHERE dedupe_key = v_key) <> 10000 THEN
    RAISE EXCEPTION 'bank row amount was not the statement amount';
  END IF;

  IF (v_cash - v_cash) <> 0 THEN RAISE EXCEPTION 'cash close formula'; END IF;
  IF (90000 - 100000) <> -10000 THEN RAISE EXCEPTION 'missing transfer would book a shortage'; END IF;

  BEGIN
    PERFORM public.reverse_cash_bank_deposit(v_tenant, v_admin, v_deposit, 'no');
    RAISE EXCEPTION 'short storno reason accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%reason_required%' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.reverse_cash_bank_deposit(v_tenant, v_staff, v_deposit, 'Falsche Zeile');
    RAISE EXCEPTION 'staff storno accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%forbidden%' THEN RAISE; END IF;
  END;

  v_reverse := public.reverse_cash_bank_deposit(v_tenant, v_admin, v_deposit, 'Falsche Zeile');
  IF v_reverse->>'result' <> 'reversed' THEN RAISE EXCEPTION 'storno failed %', v_reverse; END IF;
  SELECT current_balance_rappen INTO v_cash FROM public.cash_balances WHERE id = 'd1000000-0000-4000-8000-000000000001';
  SELECT bank_balance_rappen INTO v_bank FROM public.tenants WHERE id = v_tenant;
  IF v_cash <> 100000 OR v_bank <> 50000 THEN
    RAISE EXCEPTION 'balances after storno cash % bank %', v_cash, v_bank;
  END IF;
  IF (SELECT count(*) FROM public.cash_bank_transfer_journals WHERE deposit_id = v_deposit AND storno_of_id IS NULL) <> 1 THEN
    RAISE EXCEPTION 'original journal missing';
  END IF;
  IF (SELECT count(*) FROM public.cash_bank_transfer_journals WHERE deposit_id = v_deposit AND storno_of_id IS NOT NULL) <> 1 THEN
    RAISE EXCEPTION 'reversal journal missing';
  END IF;
  SELECT COALESCE(sum(debit_rappen), 0), COALESCE(sum(credit_rappen), 0) INTO v_debit, v_credit
  FROM public.cash_bank_transfer_lines
  WHERE journal_id = (v_reverse->>'reversal_journal_id')::uuid;
  IF v_debit <> 10000 OR v_credit <> 10000 THEN RAISE EXCEPTION 'reversal not balanced'; END IF;

  v_reverse := public.reverse_cash_bank_deposit(v_tenant, v_admin, v_deposit, 'Nochmals falsch');
  IF v_reverse->>'result' <> 'already_reversed' THEN RAISE EXCEPTION 'repeat storno failed %', v_reverse; END IF;
  IF (SELECT count(*) FROM public.cash_bank_transfer_journals WHERE deposit_id = v_deposit AND storno_of_id IS NOT NULL) <> 1 THEN
    RAISE EXCEPTION 'second reversal journal';
  END IF;

  -- Staff drawer, explicit token, and a second identical amount that must not be guessed.
  v_report := public.report_cash_bank_deposit(v_tenant, v_staff, 'staff-key-abcdef123456', 'staff', v_staff, 5000, DATE '2026-10-03', v_staff);
  v_deposit := (v_report->>'deposit_id')::uuid;
  v_token := v_report->>'reference_token';
  v_key := public.cash_bank_statement_dedupe_key('STAFF-1', DATE '2026-10-03', 5000, '', '');
  v_batch := public.persist_cash_bank_statement_lines(v_tenant, v_admin, 'csv', jsonb_build_array(
    jsonb_build_object('dedupe_key', v_key, 'amount_rappen', 5000, 'currency', 'CHF', 'direction', 'credit', 'entry_date', '2026-10-03', 'reference', '', 'remittance', v_token, 'debtor_name', '', 'bank_ref', 'STAFF-1')
  ));
  v_line := (v_batch->'lines'->0->>'statement_line_id')::uuid;
  PERFORM public.select_cash_bank_deposit_candidate(v_tenant, v_admin, v_deposit, v_line);
  v_confirm := public.confirm_cash_bank_deposit(v_tenant, v_admin, v_deposit);
  IF (SELECT current_balance_rappen FROM public.cash_balances WHERE id = 'd2000000-0000-4000-8000-000000000002') <> 75000 THEN
    RAISE EXCEPTION 'staff drawer was not reduced';
  END IF;
  IF (SELECT count(*) FROM public.cash_movements WHERE movement_type = 'cash_to_bank' AND instructor_id = v_staff) <> 1 THEN
    RAISE EXCEPTION 'staff movement missing';
  END IF;
  IF (SELECT bank_balance_rappen FROM public.tenants WHERE id = v_tenant) <> 55000 THEN
    RAISE EXCEPTION 'bank was not increased for the staff drawer';
  END IF;

  v_report := public.report_cash_bank_deposit(v_tenant, v_admin, 'ambiguous-a-12345678', 'business', NULL, 7000, DATE '2026-10-05', NULL);
  PERFORM public.report_cash_bank_deposit(v_tenant, v_admin, 'ambiguous-b-12345678', 'business', NULL, 7000, DATE '2026-10-06', v_admin);
  v_key := public.cash_bank_statement_dedupe_key('AMBIG', DATE '2026-10-05', 7000, 'Bancomat', '');
  v_batch := public.persist_cash_bank_statement_lines(v_tenant, v_admin, 'csv', jsonb_build_array(
    jsonb_build_object('dedupe_key', v_key, 'amount_rappen', 7000, 'currency', 'CHF', 'direction', 'credit', 'entry_date', '2026-10-05', 'reference', 'Bancomat', 'remittance', 'ohne referenz', 'debtor_name', '', 'bank_ref', 'AMBIG')
  ));
  v_line := (v_batch->'lines'->0->>'statement_line_id')::uuid;
  BEGIN
    PERFORM public.select_cash_bank_deposit_candidate(v_tenant, v_admin, (v_report->>'deposit_id')::uuid, v_line);
    RAISE EXCEPTION 'ambiguous amount was selected';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%not_confirmable%' THEN RAISE; END IF;
  END;
END $$;
