-- Local assertions for course invoice phase 1. Not a migration.

SELECT set_config('test.auth_role', 'service_role', false);

DO $$
DECLARE
  v_mode text;
  v_company text;
  v_late text;
  v_currency text;
  v_snapshot timestamptz;
  v_total integer;
  v_status text;
  v_open integer;
  v_qr integer;
  v_role text;
  v_hist_total integer;
BEGIN
  SELECT invoice_timing_mode, company_invoicing_mode, late_registration_policy
    INTO v_mode, v_company, v_late
  FROM public.course_categories
  WHERE id = '99999999-9999-4999-8999-999999999999';

  IF v_mode IS DISTINCT FROM 'off'
     OR v_company IS DISTINCT FROM 'manual'
     OR v_late IS DISTINCT FROM 'manual' THEN
    RAISE EXCEPTION 'category defaults are %, %, %', v_mode, v_company, v_late;
  END IF;

  SELECT agreed_currency, price_snapshot_at
    INTO v_currency, v_snapshot
  FROM public.course_registrations
  WHERE id = '66666666-6666-4666-8666-666666666666';

  IF v_currency IS DISTINCT FROM 'CHF' OR v_snapshot IS NOT NULL THEN
    RAISE EXCEPTION 'historical registration was given a snapshot';
  END IF;

  SELECT total_amount_rappen, status, open_amount_rappen, qr_amount_rappen, document_role
    INTO v_hist_total, v_status, v_open, v_qr, v_role
  FROM public.invoices
  WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  IF v_hist_total IS DISTINCT FROM 5000
     OR v_status IS DISTINCT FROM 'sent'
     OR v_open IS DISTINCT FROM 0
     OR v_qr IS DISTINCT FROM 0
     OR v_role IS DISTINCT FROM 'invoice' THEN
    RAISE EXCEPTION 'historical invoice was rewritten: % % % % %',
      v_hist_total, v_status, v_open, v_qr, v_role;
  END IF;

  SELECT status INTO v_status
  FROM public.invoices
  WHERE id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  IF v_status IS DISTINCT FROM 'pdf_created' THEN
    RAISE EXCEPTION 'pdf_created status was not preserved';
  END IF;

  INSERT INTO public.invoices (
    id, user_id, tenant_id, invoice_number,     subtotal_rappen, vat_rate, vat_amount_rappen,
    total_amount_rappen, status, payment_status, document_kind
  ) VALUES (
    'abababab-abab-4aba-8aba-abababababab',
    '33333333-3333-4333-8333-333333333333',
    '11111111-1111-4111-8111-111111111111',
    'RE-2020-0099',
    100, 0, 0, 100, 'issued', 'pending', 'invoice'
  );
  SELECT total_amount_rappen INTO v_total
  FROM public.invoices
  WHERE id = 'abababab-abab-4aba-8aba-abababababab';
  IF v_total IS DISTINCT FROM 100 THEN
    RAISE EXCEPTION 'issued insert did not keep its total';
  END IF;
END $$;

DO $$
BEGIN
  UPDATE public.course_categories
  SET invoice_timing_mode = 'days_before_start'
  WHERE id = '99999999-9999-4999-8999-999999999999';
  RAISE EXCEPTION 'lead days were not required';
EXCEPTION
  WHEN check_violation THEN
    NULL;
END $$;

DO $$
BEGIN
  UPDATE public.course_categories
  SET invoice_timing_mode = 'days_before_start', invoice_lead_days = 366
  WHERE id = '99999999-9999-4999-8999-999999999999';
  RAISE EXCEPTION 'lead days upper bound missing';
EXCEPTION
  WHEN check_violation THEN
    NULL;
END $$;

UPDATE public.course_categories
SET invoice_timing_mode = 'days_before_start', invoice_lead_days = 10
WHERE id = '99999999-9999-4999-8999-999999999999';

UPDATE public.course_categories
SET invoice_timing_mode = 'off', invoice_lead_days = NULL
WHERE id = '99999999-9999-4999-8999-999999999999';

DO $$
BEGIN
  INSERT INTO public.course_registrations (
    id, course_id, tenant_id, user_id, agreed_currency
  ) VALUES (
    '12121212-1212-4121-8121-121212121212',
    '55555555-5555-4555-8555-555555555555',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333333',
    'EUR'
  );
  RAISE EXCEPTION 'EUR was accepted';
EXCEPTION
  WHEN check_violation THEN
    NULL;
END $$;

DO $$
BEGIN
  INSERT INTO public.course_registrations (
    id, course_id, tenant_id, user_id, agreed_net_rappen
  ) VALUES (
    '12121212-1212-4121-8121-121212121213',
    '55555555-5555-4555-8555-555555555555',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333333',
    -1
  );
  RAISE EXCEPTION 'negative net accepted';
EXCEPTION
  WHEN check_violation THEN
    NULL;
END $$;

DO $$
BEGIN
  INSERT INTO public.course_registrations (
    id, course_id, tenant_id, user_id, discount_rappen
  ) VALUES (
    '12121212-1212-4121-8121-121212121214',
    '55555555-5555-4555-8555-555555555555',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333333',
    -1
  );
  RAISE EXCEPTION 'negative discount accepted';
EXCEPTION
  WHEN check_violation THEN
    NULL;
END $$;

DO $$
BEGIN
  INSERT INTO public.course_registrations (
    id, course_id, tenant_id, user_id, voucher_rappen
  ) VALUES (
    '12121212-1212-4121-8121-121212121215',
    '55555555-5555-4555-8555-555555555555',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333333',
    -1
  );
  RAISE EXCEPTION 'negative voucher accepted';
EXCEPTION
  WHEN check_violation THEN
    NULL;
END $$;

DO $$
BEGIN
  INSERT INTO public.course_registrations (
    id, course_id, tenant_id, user_id, credit_applied_rappen
  ) VALUES (
    '12121212-1212-4121-8121-121212121216',
    '55555555-5555-4555-8555-555555555555',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333333',
    -1
  );
  RAISE EXCEPTION 'negative credit accepted';
EXCEPTION
  WHEN check_violation THEN
    NULL;
END $$;

DO $$
BEGIN
  INSERT INTO public.course_registrations (
    id, course_id, tenant_id, user_id,
    agreed_net_rappen, agreed_vat_rate, agreed_vat_rappen, discount_rappen,
    voucher_rappen, agreed_gross_rappen
  ) VALUES (
    '12121212-1212-4121-8121-121212121217',
    '55555555-5555-4555-8555-555555555555',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333333',
    100, 0, 0, 500, 0, -400
  );
  RAISE EXCEPTION 'negative gross accepted';
EXCEPTION
  WHEN check_violation THEN
    NULL;
END $$;

-- net 10000, rate 8.10, vat 810, discount 100, voucher 50, gross 10660
INSERT INTO public.course_registrations (
  id, course_id, tenant_id, user_id, first_name, last_name, email,
  street, street_nr, zip, city,
  status, payment_status, payment_method,
  agreed_currency, price_source, agreed_net_rappen, discount_rappen,
  voucher_rappen, voucher_code_id, voucher_label, agreed_vat_rate,
  agreed_vat_rappen, agreed_gross_rappen, credit_applied_rappen,
  agreed_payment_method, price_snapshot_at, snapshot_formula
) VALUES (
  '66666666-6666-4666-8666-666666666667',
  '55555555-5555-4555-8555-555555555555',
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  'Ada', 'Fahrer', 'ada@example.test',
  'Bahnweg', '4', '3000', 'Bern',
  'confirmed', 'pending', 'invoice',
  'CHF', 'full', 10000, 100,
  50, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'SAVE', 8.10,
  810, 10660, 0,
  'invoice', now(), 'course_invoice_v1'
);

INSERT INTO public.payments (
  tenant_id, course_registration_id, payment_status, total_amount_rappen, refunded_amount_rappen
) VALUES
  ('11111111-1111-4111-8111-111111111111', '66666666-6666-4666-8666-666666666667', 'completed', 5000, 1000),
  ('11111111-1111-4111-8111-111111111111', '66666666-6666-4666-8666-666666666667', 'pending', 99999, 0),
  ('11111111-1111-4111-8111-111111111111', '66666666-6666-4666-8666-666666666667', 'invoiced', 99999, 0);

DO $$
DECLARE
  v_before integer;
  v_after integer;
BEGIN
  SELECT next_invoice_number INTO v_before
  FROM public.tenants
  WHERE id = '11111111-1111-4111-8111-111111111111';

  BEGIN
    PERFORM *
    FROM public.issue_course_invoice(
      '11111111-1111-4111-8111-111111111111',
      ARRAY[
        '66666666-6666-4666-8666-666666666666',
        '66666666-6666-4666-8666-666666666667'
      ]::uuid[]
    );
    RAISE EXCEPTION 'partial issue should have failed';
  EXCEPTION
    WHEN check_violation THEN
      IF SQLERRM IS DISTINCT FROM 'missing_snapshot' THEN
        RAISE;
      END IF;
  END;

  SELECT next_invoice_number INTO v_after
  FROM public.tenants
  WHERE id = '11111111-1111-4111-8111-111111111111';

  IF v_before IS DISTINCT FROM v_after THEN
    RAISE EXCEPTION 'failed issue consumed an invoice number';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.course_invoice_bindings
    WHERE registration_id = '66666666-6666-4666-8666-666666666667'
  ) THEN
    RAISE EXCEPTION 'failed issue left a binding';
  END IF;
END $$;

DO $$
DECLARE
  v_id uuid;
  v_number text;
  v_created boolean;
  v_again uuid;
  v_again_created boolean;
  v_total integer;
  v_open integer;
  v_qr integer;
  v_status text;
  v_pay text;
  v_items integer;
  v_events integer;
  v_bindings integer;
  v_invoices integer;
  v_year text := EXTRACT(YEAR FROM timezone('Europe/Zurich', now()))::text;
BEGIN
  SELECT f.invoice_id, f.invoice_number, f.created
    INTO v_id, v_number, v_created
  FROM public.issue_course_invoice(
    '11111111-1111-4111-8111-111111111111',
    ARRAY['66666666-6666-4666-8666-666666666667']::uuid[]
  ) AS f;

  IF v_created IS NOT TRUE THEN
    RAISE EXCEPTION 'first issue did not create';
  END IF;
  IF v_number IS DISTINCT FROM 'RE-' || v_year || '-0007' THEN
    RAISE EXCEPTION 'allocator number was %', v_number;
  END IF;

  SELECT total_amount_rappen, open_amount_rappen, qr_amount_rappen, status, payment_status
    INTO v_total, v_open, v_qr, v_status, v_pay
  FROM public.invoices
  WHERE id = v_id AND tenant_id = '11111111-1111-4111-8111-111111111111';

  IF v_total IS DISTINCT FROM 10660
     OR v_open IS DISTINCT FROM 6660
     OR v_qr IS DISTINCT FROM v_open
     OR v_status IS DISTINCT FROM 'issued'
     OR v_pay IS DISTINCT FROM 'partial' THEN
    RAISE EXCEPTION 'invoice amounts % open % qr % status % pay %',
      v_total, v_open, v_qr, v_status, v_pay;
  END IF;

  SELECT count(*) INTO v_items
  FROM public.invoice_items
  WHERE invoice_id = v_id
    AND registration_id = '66666666-6666-4666-8666-666666666667'
    AND line_kind IN ('course', 'discount', 'voucher');
  IF v_items IS DISTINCT FROM 3 THEN
    RAISE EXCEPTION 'expected 3 lines, got %', v_items;
  END IF;

  SELECT count(*) INTO v_events
  FROM public.course_invoice_events
  WHERE invoice_id = v_id AND kind = 'invoice_issued';
  IF v_events IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'expected one issue event';
  END IF;

  SELECT f.invoice_id, f.created
    INTO v_again, v_again_created
  FROM public.issue_course_invoice(
    '11111111-1111-4111-8111-111111111111',
    ARRAY['66666666-6666-4666-8666-666666666667']::uuid[]
  ) AS f;

  IF v_again IS DISTINCT FROM v_id OR v_again_created IS NOT FALSE THEN
    RAISE EXCEPTION 'retry did not return the same invoice';
  END IF;

  SELECT count(*) INTO v_bindings FROM public.course_invoice_bindings;
  SELECT count(*) INTO v_invoices
  FROM public.invoices
  WHERE invoice_number LIKE 'RE-' || v_year || '-%';
  SELECT count(*) INTO v_events
  FROM public.course_invoice_events
  WHERE kind = 'invoice_issued';

  IF v_bindings IS DISTINCT FROM 1 OR v_invoices IS DISTINCT FROM 1 OR v_events IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'retry duplicated binding %, invoices %, events %',
      v_bindings, v_invoices, v_events;
  END IF;
END $$;

DO $$
BEGIN
  PERFORM *
  FROM public.issue_course_invoice(
    '11111111-1111-4111-8111-111111111111',
    ARRAY['77777777-7777-4777-8777-777777777777']::uuid[]
  );
  RAISE EXCEPTION 'cross-tenant registration was invoiced';
EXCEPTION
  WHEN no_data_found THEN
    IF SQLERRM IS DISTINCT FROM 'registration_not_found' THEN
      RAISE;
    END IF;
END $$;

DO $$
DECLARE
  v_reg uuid := '66666666-6666-4666-8666-666666666668';
BEGIN
  INSERT INTO public.course_registrations (
    id, course_id, tenant_id, user_id, first_name, last_name, email,
    status, payment_status, payment_method,
    agreed_currency, agreed_net_rappen, discount_rappen, voucher_rappen,
    agreed_vat_rate, agreed_vat_rappen, agreed_gross_rappen,
    agreed_payment_method, price_snapshot_at, snapshot_formula,
    voucher_code_id
  ) VALUES (
    v_reg,
    '55555555-5555-4555-8555-555555555555',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333333',
    'Ada', 'Fahrer', 'ada@example.test',
    'confirmed', 'pending', 'invoice',
    'CHF', 1000, 0, 0, 0, 0, 1000,
    'invoice', now(), 'course_invoice_v1',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  );

  PERFORM *
  FROM public.issue_course_invoice(
    '11111111-1111-4111-8111-111111111111',
    ARRAY[v_reg]::uuid[]
  );
  RAISE EXCEPTION 'foreign voucher was accepted';
EXCEPTION
  WHEN no_data_found THEN
    IF SQLERRM IS DISTINCT FROM 'voucher_not_found' THEN
      RAISE;
    END IF;
END $$;

DO $$
DECLARE
  v_reg uuid := '66666666-6666-4666-8666-666666666669';
  v_id uuid;
  v_total integer;
  v_open integer;
  v_qr integer;
BEGIN
  INSERT INTO public.course_registrations (
    id, course_id, tenant_id, user_id, first_name, last_name, email,
    status, payment_status, payment_method,
    agreed_currency, agreed_net_rappen, discount_rappen, voucher_rappen,
    agreed_vat_rate, agreed_vat_rappen, agreed_gross_rappen, credit_applied_rappen,
    agreed_payment_method, price_snapshot_at, snapshot_formula
  ) VALUES (
    v_reg,
    '55555555-5555-4555-8555-555555555555',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333333',
    'Ada', 'Fahrer', 'ada@example.test',
    'confirmed', 'pending', 'invoice',
    'CHF', 1000, 0, 0, 0, 0, 1000, 5000,
    'invoice', now(), 'course_invoice_v1'
  );

  SELECT f.invoice_id INTO v_id
  FROM public.issue_course_invoice(
    '11111111-1111-4111-8111-111111111111',
    ARRAY[v_reg]::uuid[]
  ) AS f;

  SELECT total_amount_rappen, open_amount_rappen, qr_amount_rappen
    INTO v_total, v_open, v_qr
  FROM public.invoices WHERE id = v_id;

  IF v_total IS DISTINCT FROM 1000 OR v_open IS DISTINCT FROM 0 OR v_qr IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'credit drove a negative open amount % % %', v_total, v_open, v_qr;
  END IF;
END $$;

-- Two nets of 33 at 8.10% must keep per-line rounding (vat 3+3), not header re-round (vat 5).
DO $$
DECLARE
  v_a uuid := '66666666-6666-4666-8666-666666666671';
  v_b uuid := '66666666-6666-4666-8666-666666666672';
  v_id uuid;
  v_vat integer;
  v_total integer;
  v_user uuid := '33333333-3333-4333-8333-333333333333';
BEGIN
  INSERT INTO public.course_registrations (
    id, course_id, tenant_id, user_id, first_name, last_name, email,
    status, payment_status, payment_method,
    agreed_net_rappen, agreed_vat_rate, agreed_vat_rappen, agreed_gross_rappen,
    agreed_payment_method, price_snapshot_at, snapshot_formula
  ) VALUES
    (v_a, '55555555-5555-4555-8555-555555555556', '11111111-1111-4111-8111-111111111111',
     v_user, 'Ada', 'Eins', 'ada@example.test', 'confirmed', 'pending', 'invoice',
     33, 8.10, 3, 36, 'invoice', now(), 'course_invoice_v1'),
    (v_b, '55555555-5555-4555-8555-555555555556', '11111111-1111-4111-8111-111111111111',
     v_user, 'Bea', 'Zwei', 'bea@example.test', 'confirmed', 'pending', 'invoice',
     33, 8.10, 3, 36, 'invoice', now(), 'course_invoice_v1');

  SELECT f.invoice_id INTO v_id
  FROM public.issue_course_invoice(
    '11111111-1111-4111-8111-111111111111',
    ARRAY[v_a, v_b]::uuid[]
  ) AS f;

  SELECT vat_amount_rappen, total_amount_rappen
    INTO v_vat, v_total
  FROM public.invoices WHERE id = v_id;

  IF v_vat IS DISTINCT FROM 6 OR v_total IS DISTINCT FROM 72 THEN
    RAISE EXCEPTION 'header rounding rewrote course totals vat % total %', v_vat, v_total;
  END IF;
END $$;

DO $$
DECLARE
  v_batch uuid;
  v_other uuid;
BEGIN
  INSERT INTO public.course_invoice_batches (id, tenant_id, course_id, company_id, status)
  VALUES (
    '13131313-1313-4131-8131-131313131313',
    '11111111-1111-4111-8111-111111111111',
    '55555555-5555-4555-8555-555555555556',
    '88888888-8888-4888-8888-888888888888',
    'draft'
  );

  BEGIN
    INSERT INTO public.course_invoice_batches (tenant_id, course_id, company_id, status)
    VALUES (
      '11111111-1111-4111-8111-111111111111',
      '55555555-5555-4555-8555-555555555556',
      '88888888-8888-4888-8888-888888888888',
      'approved'
    );
    RAISE EXCEPTION 'second open batch was allowed';
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;

  UPDATE public.course_invoice_batches
  SET status = 'cancelled'
  WHERE id = '13131313-1313-4131-8131-131313131313';

  INSERT INTO public.course_invoice_batches (id, tenant_id, course_id, company_id, status)
  VALUES (
    '13131313-1313-4131-8131-131313131314',
    '11111111-1111-4111-8111-111111111111',
    '55555555-5555-4555-8555-555555555556',
    '88888888-8888-4888-8888-888888888888',
    'draft'
  )
  RETURNING id INTO v_batch;

  INSERT INTO public.course_invoice_batch_items (batch_id, registration_id)
  VALUES (v_batch, '66666666-6666-4666-8666-666666666671');

  INSERT INTO public.course_invoice_batches (id, tenant_id, course_id, company_id, status)
  VALUES (
    '13131313-1313-4131-8131-131313131315',
    '11111111-1111-4111-8111-111111111111',
    '55555555-5555-4555-8555-555555555555',
    '88888888-8888-4888-8888-888888888888',
    'draft'
  )
  RETURNING id INTO v_other;

  BEGIN
    INSERT INTO public.course_invoice_batch_items (batch_id, registration_id)
    VALUES (v_other, '66666666-6666-4666-8666-666666666671');
    RAISE EXCEPTION 'registration joined two open batches';
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;

  BEGIN
    INSERT INTO public.course_invoice_bindings (tenant_id, registration_id, invoice_id)
    VALUES (
      '11111111-1111-4111-8111-111111111111',
      '66666666-6666-4666-8666-666666666667',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    );
    RAISE EXCEPTION 'cross-tenant invoice binding was stored';
  EXCEPTION
    WHEN check_violation THEN
      IF SQLERRM IS DISTINCT FROM 'tenant_mismatch' THEN
        RAISE;
      END IF;
  END;
END $$;

DO $$
BEGIN
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM *
    FROM public.issue_course_invoice(
      '11111111-1111-4111-8111-111111111111',
      ARRAY['66666666-6666-4666-8666-666666666667']::uuid[]
    );
    RAISE EXCEPTION 'authenticated was allowed to issue';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;
  RESET ROLE;
END $$;

DO $$
BEGIN
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM 1 FROM public.course_invoice_bindings;
    RAISE EXCEPTION 'anon read bindings';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;
  RESET ROLE;
END $$;

DO $$
BEGIN
  SET LOCAL ROLE service_role;
  BEGIN
    DELETE FROM public.course_invoice_bindings;
    RAISE EXCEPTION 'service_role deleted a binding';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;
  RESET ROLE;
END $$;

DO $$
DECLARE
  v_reg uuid := '66666666-6666-4666-8666-666666666691';
BEGIN
  INSERT INTO public.course_registrations (
    id, course_id, tenant_id, user_id, first_name, last_name, email,
    status, payment_status, payment_method,
    agreed_net_rappen, agreed_vat_rate, agreed_vat_rappen, agreed_gross_rappen,
    agreed_payment_method, price_snapshot_at, snapshot_formula
  ) VALUES (
    v_reg,
    '55555555-5555-4555-8555-555555555555',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333333',
    'W', 'Allee', 'w@example.test',
    'confirmed', 'pending', 'wallee',
    1000, 0, 0, 1000,
    'invoice', now(), 'course_invoice_v1'
  );

  BEGIN
    PERFORM *
    FROM public.issue_course_invoice(
      '11111111-1111-4111-8111-111111111111',
      ARRAY[v_reg]::uuid[]
    );
    RAISE EXCEPTION 'wallee registration was invoiced';
  EXCEPTION
    WHEN check_violation THEN
      IF SQLERRM IS DISTINCT FROM 'payment_method_not_invoice' THEN
        RAISE;
      END IF;
  END;

  IF EXISTS (SELECT 1 FROM public.course_invoice_bindings WHERE registration_id = v_reg) THEN
    RAISE EXCEPTION 'rejected wallee issue left a binding';
  END IF;
END $$;

DO $$
DECLARE
  v_reg uuid := '66666666-6666-4666-8666-666666666692';
  v_before integer;
  v_after integer;
BEGIN
  INSERT INTO public.course_registrations (
    id, course_id, tenant_id, user_id, first_name, last_name, email,
    status, payment_status, payment_method,
    agreed_net_rappen, agreed_vat_rate, agreed_vat_rappen, agreed_gross_rappen,
    agreed_payment_method, price_snapshot_at, snapshot_formula
  ) VALUES (
    v_reg,
    '55555555-5555-4555-8555-555555555555',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333333',
    'Pay', 'Fremd', 'pay@example.test',
    'confirmed', 'pending', 'invoice',
    1000, 0, 0, 1000,
    'invoice', now(), 'course_invoice_v1'
  );

  INSERT INTO public.payments (
    tenant_id, course_registration_id, payment_status, total_amount_rappen
  ) VALUES (
    '22222222-2222-4222-8222-222222222222',
    v_reg,
    'paid',
    100
  );

  SELECT count(*)::integer INTO v_before FROM public.invoices;

  BEGIN
    PERFORM *
    FROM public.issue_course_invoice(
      '11111111-1111-4111-8111-111111111111',
      ARRAY[v_reg]::uuid[]
    );
    RAISE EXCEPTION 'foreign payment was ignored';
  EXCEPTION
    WHEN check_violation THEN
      IF SQLERRM IS DISTINCT FROM 'registration_not_billable' THEN
        RAISE;
      END IF;
  END;

  SELECT count(*)::integer INTO v_after FROM public.invoices;
  IF v_before IS DISTINCT FROM v_after THEN
    RAISE EXCEPTION 'foreign payment issue created an invoice';
  END IF;
END $$;

-- JWT insert must not keep a forged agreed gross.
SELECT set_config('test.auth_role', 'authenticated', false);

INSERT INTO public.course_registrations (
  id, course_id, tenant_id, user_id, email,
  agreed_gross_rappen, agreed_net_rappen, price_snapshot_at, payment_status, payment_method
) VALUES (
  '66666666-6666-4666-8666-666666666680',
  '55555555-5555-4555-8555-555555555555',
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  'jwt@example.test',
  999999, 999999, now(), 'paid', 'wallee'
);

DO $$
DECLARE
  v_gross integer;
  v_snap timestamptz;
  v_status text;
  v_method text;
BEGIN
  SELECT agreed_gross_rappen, price_snapshot_at, payment_status, payment_method
    INTO v_gross, v_snap, v_status, v_method
  FROM public.course_registrations
  WHERE id = '66666666-6666-4666-8666-666666666680';

  IF v_gross IS NOT NULL OR v_snap IS NOT NULL
     OR v_status IS DISTINCT FROM 'pending'
     OR v_method IS NOT NULL THEN
    RAISE EXCEPTION 'JWT forged payment or snapshot gross % snap % status % method %',
      v_gross, v_snap, v_status, v_method;
  END IF;
END $$;

SELECT set_config('test.auth_role', 'service_role', false);

INSERT INTO public.course_registrations (
  id, course_id, tenant_id, user_id, first_name, last_name, email,
  status, payment_status, payment_method,
  agreed_net_rappen, agreed_vat_rate, agreed_vat_rappen, agreed_gross_rappen,
  agreed_payment_method, price_snapshot_at, snapshot_formula
) VALUES (
  '66666666-6666-4666-8666-666666666690',
  '55555555-5555-4555-8555-555555555555',
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  'Cora', 'Parallel', 'cora@example.test',
  'confirmed', 'pending', 'invoice',
  2000, 0, 0, 2000,
  'invoice', now(), 'course_invoice_v1'
);
