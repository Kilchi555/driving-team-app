-- Staff POS payment completion. NOT APPLIED.
-- Replaces public.staff_pos_sale only. Does not add columns or indexes.
-- Does not grant anon or authenticated. Does not change accounting triggers.
-- Apply after migrations/20261003_staff_pos_credit_remediation.sql so this
-- function body is the one left installed. Does not edit that file.
-- Cash still credits inside create. Invoice, invoice_send, and deferred do not.
-- complete moves a pending deferred staff-product sale to completed and then
-- applies the snapshot credit in the same transaction. A later exception,
-- including zero_credit_snapshot, rolls the status change back.
-- A second complete finds the payment already completed and does not insert
-- a second credit_product_purchase row.

CREATE OR REPLACE FUNCTION public.staff_pos_sale(
  p_actor_user_id uuid,
  p_customer_id uuid,
  p_items jsonb,
  p_idempotency_key text,
  p_method text,
  p_action text,
  p_payment_id uuid,
  p_claim_token text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $fn$
DECLARE
  v_actor public.users%ROWTYPE;
  v_customer public.users%ROWTYPE;
  v_tenant uuid;
  v_payment public.payments%ROWTYPE;
  v_item jsonb;
  v_product record;
  v_qty integer;
  v_qty_num numeric;
  v_price integer;
  v_line bigint;
  v_gross bigint := 0;
  v_credit bigint := 0;
  v_credit_unit integer;
  v_products jsonb := '[]'::jsonb;
  v_names text := '';
  v_description text;
  v_payment_id uuid;
  v_invoice_id uuid;
  v_invoice_number text;
  v_invoice_total integer;
  v_vat_rate numeric;
  v_net bigint;
  v_candidate bigint;
  v_match_count integer := 0;
  v_floor_net bigint;
  v_bases bigint[];
  v_line_grosses bigint[];
  v_alloc_sum bigint;
  v_leftover bigint;
  v_room bigint;
  v_take bigint;
  v_line_net bigint;
  v_line_vat integer;
  v_replayed boolean := false;
  v_completion_replay boolean := false;
  v_before integer := 0;
  v_after integer := 0;
  v_credit_applied boolean := false;
  v_fulfillment text;
  v_sent timestamptz;
  v_claim_at timestamptz;
  v_token text;
  v_now timestamptz := pg_catalog.now();
  v_idx integer := 0;
  v_line_count integer := 0;
  v_reply_email text;
  v_reply_name text;
BEGIN
  IF p_action NOT IN (
    'create', 'apply_credit', 'complete', 'claim_send', 'release_send',
    'claim_wallee', 'release_wallee', 'attach_wallee'
  ) THEN
    RAISE EXCEPTION 'invalid_action';
  END IF;

  IF p_actor_user_id IS NOT NULL THEN
    SELECT * INTO v_actor FROM public.users WHERE id = p_actor_user_id;
    IF NOT FOUND
      OR v_actor.deleted_at IS NOT NULL
      OR v_actor.is_active IS FALSE
      OR v_actor.tenant_id IS NULL
    THEN
      RAISE EXCEPTION 'forbidden_actor' USING ERRCODE = '42501';
    END IF;
    IF p_action = 'apply_credit' THEN
      IF v_actor.role NOT IN ('admin', 'staff', 'super_admin', 'tenant_admin') THEN
        RAISE EXCEPTION 'forbidden_role' USING ERRCODE = '42501';
      END IF;
    ELSIF v_actor.role NOT IN ('admin', 'staff', 'super_admin') THEN
      RAISE EXCEPTION 'forbidden_role' USING ERRCODE = '42501';
    END IF;
    v_tenant := v_actor.tenant_id;
  ELSIF p_action <> 'apply_credit' THEN
    RAISE EXCEPTION 'forbidden_actor' USING ERRCODE = '42501';
  END IF;

  IF p_action = 'create' THEN
    IF p_method NOT IN ('cash', 'deferred', 'invoice', 'invoice_send', 'wallee') THEN
      RAISE EXCEPTION 'invalid_method';
    END IF;
    IF p_idempotency_key IS NULL
      OR p_idempotency_key !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    THEN
      RAISE EXCEPTION 'invalid_idempotency_key';
    END IF;
    IF p_customer_id IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
      RAISE EXCEPTION 'invalid_items';
    END IF;

    SELECT * INTO v_customer
    FROM public.users
    WHERE id = p_customer_id
      AND tenant_id = v_tenant
      AND role = 'client'
      AND deleted_at IS NULL
      AND is_active IS TRUE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'invalid_customer';
    END IF;

    v_line_count := jsonb_array_length(p_items);
    IF v_line_count < 1 OR v_line_count > 20 THEN
      RAISE EXCEPTION 'invalid_items';
    END IF;

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) AS t(value)
    LOOP
      IF EXISTS (
        SELECT 1 FROM jsonb_object_keys(v_item) AS k(key)
        WHERE k.key NOT IN ('product_id', 'quantity')
      ) THEN
        RAISE EXCEPTION 'client_price_rejected';
      END IF;
      IF jsonb_typeof(v_item->'quantity') <> 'number' THEN
        RAISE EXCEPTION 'invalid_quantity';
      END IF;
      v_qty_num := (v_item->>'quantity')::numeric;
      IF v_qty_num <> trunc(v_qty_num) THEN
        RAISE EXCEPTION 'invalid_quantity';
      END IF;
      v_qty := v_qty_num::integer;
      IF v_qty < 1 OR v_qty > 100 THEN
        RAISE EXCEPTION 'invalid_quantity';
      END IF;

      SELECT id, tenant_id, name, price_rappen, is_active, is_voucher, is_credit_product, credit_amount_rappen
      INTO v_product
      FROM public.products
      WHERE id = (v_item->>'product_id')::uuid
      FOR SHARE;

      IF NOT FOUND
        OR v_product.tenant_id IS DISTINCT FROM v_tenant
        OR v_product.is_active IS DISTINCT FROM TRUE
        OR v_product.is_voucher IS TRUE
        OR v_product.price_rappen IS NULL
        OR v_product.price_rappen <= 0
      THEN
        RAISE EXCEPTION 'invalid_product';
      END IF;

      v_price := v_product.price_rappen;
      v_line := v_price::bigint * v_qty::bigint;
      IF v_line <= 0 OR v_line > 5000000 OR v_gross + v_line > 5000000 OR v_gross + v_line > 2147483647 THEN
        RAISE EXCEPTION 'overflow';
      END IF;
      v_gross := v_gross + v_line;

      v_credit_unit := 0;
      IF v_product.is_credit_product IS TRUE AND COALESCE(v_product.credit_amount_rappen, 0) > 0 THEN
        v_credit_unit := v_product.credit_amount_rappen;
        IF v_credit + (v_credit_unit::bigint * v_qty::bigint) > 2147483647 THEN
          RAISE EXCEPTION 'overflow';
        END IF;
        v_credit := v_credit + (v_credit_unit::bigint * v_qty::bigint);
      END IF;

      IF v_names <> '' THEN
        v_names := v_names || ', ';
      END IF;
      v_names := v_names || v_qty::text || 'x ' || COALESCE(v_product.name, 'Produkt');

      v_products := v_products || jsonb_build_array(jsonb_build_object(
        'product_id', v_product.id,
        'name', v_product.name,
        'quantity', v_qty,
        'price_rappen', v_price,
        'is_credit_product', (v_credit_unit > 0),
        'credit_amount_rappen', v_credit_unit
      ));
    END LOOP;

    v_description := 'Produktverkauf: ' || v_names;
    IF char_length(v_description) > 240 THEN
      v_description := left(v_description, 237) || '...';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext(v_tenant::text), hashtext(p_idempotency_key));

    SELECT * INTO v_payment
    FROM public.payments
    WHERE tenant_id = v_tenant
      AND metadata->>'source' = 'staff_product_sale'
      AND metadata->>'idempotency_key' = p_idempotency_key
    LIMIT 1;

    IF FOUND THEN
      v_replayed := true;
      v_payment_id := v_payment.id;
    ELSE
      SELECT default_vat_rate INTO v_vat_rate
      FROM public.tenants
      WHERE id = v_tenant;
      IF v_vat_rate IS NULL OR v_vat_rate < 0 OR v_vat_rate > 100 THEN
        RAISE EXCEPTION 'invalid_vat_rate';
      END IF;

      v_floor_net := floor((v_gross::numeric * 100) / (100 + v_vat_rate))::bigint;
      v_net := NULL;
      v_match_count := 0;
      FOR v_candidate IN v_floor_net - 1 .. v_floor_net + 1 LOOP
        IF v_candidate >= 0
          AND (v_candidate + ROUND((v_candidate::numeric * v_vat_rate / 100)::numeric)) = v_gross
        THEN
          v_net := v_candidate;
          v_match_count := v_match_count + 1;
        END IF;
      END LOOP;
      IF v_match_count <> 1 OR v_net IS NULL THEN
        RAISE EXCEPTION 'no_exact_net';
      END IF;

      BEGIN
        INSERT INTO public.payments (
          user_id,
          staff_id,
          tenant_id,
          appointment_id,
          lesson_price_rappen,
          admin_fee_rappen,
          products_price_rappen,
          discount_amount_rappen,
          voucher_discount_rappen,
          credit_used_rappen,
          total_amount_rappen,
          amount_paid_rappen,
          payment_method,
          payment_provider,
          payment_status,
          paid_at,
          currency,
          description,
          metadata
        ) VALUES (
          v_customer.id,
          v_actor.id,
          v_tenant,
          NULL,
          0,
          0,
          v_gross::integer,
          0,
          0,
          0,
          v_gross::integer,
          CASE WHEN p_method = 'cash' THEN v_gross::integer ELSE 0 END,
          CASE WHEN p_method = 'invoice_send' THEN 'invoice' ELSE p_method END,
          CASE WHEN p_method = 'wallee' THEN 'wallee' ELSE NULL END,
          CASE WHEN p_method = 'cash' THEN 'completed' ELSE 'pending' END,
          CASE WHEN p_method = 'cash' THEN v_now ELSE NULL END,
          'CHF',
          v_description,
          jsonb_build_object(
            'source', 'staff_product_sale',
            'idempotency_key', p_idempotency_key,
            'fulfillment', p_method,
            'products', v_products
          ) || jsonb_build_object(
            'vat_rate', v_vat_rate,
            'gross_rappen', v_gross,
            'net_rappen', v_net
          )
        )
        RETURNING id INTO v_payment_id;
      EXCEPTION
        WHEN unique_violation THEN
          SELECT id INTO v_payment_id
          FROM public.payments
          WHERE tenant_id = v_tenant
            AND metadata->>'source' = 'staff_product_sale'
            AND metadata->>'idempotency_key' = p_idempotency_key
          LIMIT 1;
          IF v_payment_id IS NULL THEN
            RAISE;
          END IF;
          v_replayed := true;
      END;
    END IF;

    IF v_replayed THEN
      SELECT * INTO v_payment FROM public.payments WHERE id = v_payment_id;
      SELECT email, trim(both ' ' FROM concat_ws(' ', first_name, last_name))
      INTO v_reply_email, v_reply_name
      FROM public.users
      WHERE id = v_payment.user_id;
      SELECT EXISTS (
        SELECT 1 FROM public.credit_transactions
        WHERE reference_id = v_payment_id
          AND reference_type = 'payment'
          AND transaction_type = 'credit_product_purchase'
      ) INTO v_credit_applied;
      RETURN jsonb_build_object(
        'ok', true,
        'replayed', true,
        'payment_id', v_payment.id,
        'invoice_id', v_payment.invoice_id,
        'payment_status', v_payment.payment_status,
        'payment_method', v_payment.payment_method,
        'fulfillment', v_payment.metadata->>'fulfillment',
        'total_rappen', v_payment.total_amount_rappen,
        'credit_applied', v_credit_applied,
        'products', COALESCE(v_payment.metadata->'products', '[]'::jsonb),
        'customer_email', v_reply_email,
        'customer_name', v_reply_name,
        'wallee_transaction_id', v_payment.wallee_transaction_id,
        'vat_rate', v_payment.metadata->'vat_rate',
        'gross_rappen', v_payment.metadata->'gross_rappen',
        'net_rappen', v_payment.metadata->'net_rappen'
      );
    END IF;

    IF p_method = 'cash' THEN
      INSERT INTO public.cash_transactions (
        instructor_id,
        student_id,
        appointment_id,
        amount_rappen,
        notes,
        status,
        tenant_id,
        transaction_source,
        confirmed_by,
        confirmed_at,
        collected_at,
        created_at
      ) VALUES (
        v_actor.id,
        v_customer.id,
        NULL,
        v_gross::integer,
        'Produktverkauf Payment ' || v_payment_id::text,
        'confirmed',
        v_tenant,
        'product_sale',
        v_actor.id,
        v_now,
        v_now,
        v_now
      );
    END IF;

    IF p_method IN ('invoice', 'invoice_send') THEN
      v_invoice_number := public.allocate_invoice_number(v_tenant);
      IF v_invoice_number IS NULL OR v_invoice_number = '' THEN
        RAISE EXCEPTION 'invoice_number_failed';
      END IF;

      INSERT INTO public.invoices (
        tenant_id,
        user_id,
        staff_id,
        document_kind,
        invoice_number,
        invoice_date,
        due_date,
        billing_type,
        billing_contact_person,
        billing_email,
        billing_street,
        billing_street_number,
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
        paid_amount_rappen,
        sent_at,
        product_sale_id,
        appointment_id,
        notes
      ) VALUES (
        v_tenant,
        v_customer.id,
        v_actor.id,
        'invoice',
        v_invoice_number,
        CURRENT_DATE,
        CURRENT_DATE + 30,
        'individual',
        NULLIF(trim(both ' ' FROM concat_ws(' ', v_customer.first_name, v_customer.last_name)), ''),
        v_customer.email,
        v_customer.street,
        v_customer.street_nr,
        v_customer.zip,
        v_customer.city,
        'CH',
        v_net::integer,
        v_vat_rate,
        (v_gross - v_net)::integer,
        0,
        v_gross::integer,
        'pdf_created',
        'pending',
        0,
        NULL,
        NULL,
        NULL,
        'Produktverkauf'
      )
      RETURNING id, total_amount_rappen INTO v_invoice_id, v_invoice_total;

      IF v_invoice_total IS DISTINCT FROM v_gross::integer THEN
        RAISE EXCEPTION 'invoice_total_mismatch';
      END IF;

      v_bases := '{}'::bigint[];
      v_line_grosses := '{}'::bigint[];
      v_alloc_sum := 0;
      FOR v_item IN SELECT value FROM jsonb_array_elements(v_products) AS t(value)
      LOOP
        v_line := (v_item->>'price_rappen')::bigint * (v_item->>'quantity')::bigint;
        v_line_net := (v_net * v_line) / v_gross;
        v_bases := v_bases || v_line_net;
        v_line_grosses := v_line_grosses || v_line;
        v_alloc_sum := v_alloc_sum + v_line_net;
      END LOOP;
      v_leftover := v_net - v_alloc_sum;
      v_idx := v_line_count;
      WHILE v_leftover > 0 AND v_idx >= 1 LOOP
        v_room := v_line_grosses[v_idx] - v_bases[v_idx];
        IF v_room > 0 THEN
          v_take := LEAST(v_room, v_leftover);
          v_bases[v_idx] := v_bases[v_idx] + v_take;
          v_leftover := v_leftover - v_take;
        END IF;
        v_idx := v_idx - 1;
      END LOOP;
      IF v_leftover <> 0 THEN
        RAISE EXCEPTION 'vat_allocation_failed';
      END IF;

      v_idx := 0;
      FOR v_item IN SELECT value FROM jsonb_array_elements(v_products) AS t(value)
      LOOP
        v_idx := v_idx + 1;
        v_line := v_line_grosses[v_idx];
        v_line_net := v_bases[v_idx];
        v_line_vat := (v_line - v_line_net)::integer;
        IF v_line_vat < 0 OR v_line_net < 0 OR v_line_net > v_line THEN
          RAISE EXCEPTION 'vat_allocation_failed';
        END IF;

        INSERT INTO public.invoice_items (
          invoice_id,
          tenant_id,
          product_id,
          product_name,
          quantity,
          unit_price_rappen,
          total_price_rappen,
          vat_rate,
          vat_amount_rappen,
          sort_order,
          credit_to_wallet,
          credit_amount_rappen
        ) VALUES (
          v_invoice_id,
          v_tenant,
          (v_item->>'product_id')::uuid,
          v_item->>'name',
          (v_item->>'quantity')::numeric,
          (v_line_net / (v_item->>'quantity')::integer)::integer,
          v_line_net::integer,
          v_vat_rate,
          v_line_vat,
          v_idx - 1,
          false,
          NULL
        );
      END LOOP;

      UPDATE public.payments
      SET invoice_id = v_invoice_id,
          updated_at = v_now
      WHERE id = v_payment_id
        AND tenant_id = v_tenant;
    END IF;

    IF p_method = 'cash' AND v_credit > 0 THEN
      SELECT balance_rappen INTO v_before
      FROM public.student_credits
      WHERE user_id = v_customer.id AND tenant_id = v_tenant
      FOR UPDATE;
      IF NOT FOUND THEN
        INSERT INTO public.student_credits (user_id, tenant_id, balance_rappen, notes, updated_at)
        VALUES (v_customer.id, v_tenant, 0, 'Produktverkauf', v_now);
        v_before := 0;
      END IF;
      v_after := v_before + v_credit::integer;
      UPDATE public.student_credits
      SET balance_rappen = v_after, updated_at = v_now
      WHERE user_id = v_customer.id AND tenant_id = v_tenant;

      INSERT INTO public.credit_transactions (
        user_id, tenant_id, transaction_type, amount_rappen,
        balance_before_rappen, balance_after_rappen,
        reference_id, reference_type, notes, created_by, created_at
      ) VALUES (
        v_customer.id, v_tenant, 'credit_product_purchase', v_credit::integer,
        v_before, v_after, v_payment_id, 'payment',
        'Produktverkauf', v_actor.id, v_now
      );
      v_credit_applied := true;
    END IF;

    RETURN jsonb_build_object(
      'ok', true,
      'replayed', false,
      'payment_id', v_payment_id,
      'invoice_id', v_invoice_id,
      'payment_status', CASE WHEN p_method = 'cash' THEN 'completed' ELSE 'pending' END,
      'payment_method', CASE WHEN p_method = 'invoice_send' THEN 'invoice' ELSE p_method END,
      'fulfillment', p_method,
      'total_rappen', v_gross,
      'credit_applied', v_credit_applied,
      'credit_rappen', CASE WHEN v_credit_applied THEN v_credit ELSE 0 END,
      'products', v_products,
      'customer_email', v_customer.email,
      'customer_name', trim(both ' ' FROM concat_ws(' ', v_customer.first_name, v_customer.last_name)),
      'wallee_transaction_id', NULL,
      'vat_rate', v_vat_rate,
      'gross_rappen', v_gross,
      'net_rappen', v_net
    );
  END IF;

  IF p_payment_id IS NULL THEN
    RAISE EXCEPTION 'invalid_payment';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('staff-pos-payment'), hashtext(p_payment_id::text));

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND OR v_payment.metadata->>'source' IS DISTINCT FROM 'staff_product_sale' THEN
    RAISE EXCEPTION 'invalid_payment';
  END IF;
  IF v_payment.tenant_id IS NULL THEN
    RAISE EXCEPTION 'invalid_tenant';
  END IF;
  IF p_actor_user_id IS NOT NULL AND v_payment.tenant_id IS DISTINCT FROM v_tenant THEN
    RAISE EXCEPTION 'foreign_tenant';
  END IF;
  v_tenant := v_payment.tenant_id;
  v_fulfillment := v_payment.metadata->>'fulfillment';
  v_payment_id := v_payment.id;

  IF p_action = 'claim_send' THEN
    IF v_fulfillment IS DISTINCT FROM 'invoice_send' OR v_payment.invoice_id IS NULL THEN
      RAISE EXCEPTION 'invalid_invoice';
    END IF;
    SELECT sent_at INTO v_sent
    FROM public.invoices
    WHERE id = v_payment.invoice_id AND tenant_id = v_tenant;
    IF v_sent IS NOT NULL THEN
      RETURN jsonb_build_object(
        'ok', true, 'claimed', false, 'already_sent', true, 'in_progress', false,
        'payment_id', v_payment_id, 'invoice_id', v_payment.invoice_id
      );
    END IF;
    v_claim_at := NULLIF(v_payment.metadata->>'send_claim_at', '')::timestamptz;
    IF v_claim_at IS NOT NULL AND v_claim_at > v_now - interval '2 minutes' THEN
      RETURN jsonb_build_object(
        'ok', true, 'claimed', false, 'already_sent', false, 'in_progress', true,
        'payment_id', v_payment_id, 'invoice_id', v_payment.invoice_id
      );
    END IF;
    v_token := gen_random_uuid()::text;
    UPDATE public.payments
    SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
          'send_claim_at', v_now,
          'send_claim_token', v_token
        ),
        updated_at = v_now
    WHERE id = v_payment_id AND tenant_id = v_tenant;
    RETURN jsonb_build_object(
      'ok', true, 'claimed', true, 'already_sent', false, 'in_progress', false,
      'claim_token', v_token, 'payment_id', v_payment_id, 'invoice_id', v_payment.invoice_id
    );
  END IF;

  IF p_action = 'release_send' THEN
    IF p_claim_token IS NULL
      OR v_payment.metadata->>'send_claim_token' IS DISTINCT FROM p_claim_token
    THEN
      RAISE EXCEPTION 'invalid_claim';
    END IF;
    SELECT sent_at INTO v_sent FROM public.invoices WHERE id = v_payment.invoice_id;
    IF v_sent IS NULL THEN
      UPDATE public.payments
      SET metadata = (COALESCE(metadata, '{}'::jsonb) - 'send_claim_at') - 'send_claim_token',
          updated_at = v_now
      WHERE id = v_payment_id AND tenant_id = v_tenant;
    END IF;
    RETURN jsonb_build_object('ok', true, 'released', true, 'payment_id', v_payment_id);
  END IF;

  IF p_action = 'claim_wallee' THEN
    IF v_fulfillment IS DISTINCT FROM 'wallee' THEN
      RAISE EXCEPTION 'invalid_method';
    END IF;
    IF v_payment.wallee_transaction_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'ok', true, 'claimed', false, 'already_started', true,
        'payment_id', v_payment_id,
        'wallee_transaction_id', v_payment.wallee_transaction_id,
        'payment_url', v_payment.metadata->>'payment_url'
      );
    END IF;
    v_claim_at := NULLIF(v_payment.metadata->>'wallee_claim_at', '')::timestamptz;
    IF v_claim_at IS NOT NULL AND v_claim_at > v_now - interval '2 minutes' THEN
      RETURN jsonb_build_object(
        'ok', true, 'claimed', false, 'already_started', false, 'in_progress', true,
        'payment_id', v_payment_id
      );
    END IF;
    v_token := gen_random_uuid()::text;
    UPDATE public.payments
    SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
          'wallee_claim_at', v_now,
          'wallee_claim_token', v_token
        ),
        updated_at = v_now
    WHERE id = v_payment_id AND tenant_id = v_tenant;
    RETURN jsonb_build_object(
      'ok', true, 'claimed', true, 'already_started', false, 'in_progress', false,
      'claim_token', v_token, 'payment_id', v_payment_id,
      'total_rappen', v_payment.total_amount_rappen,
      'products', COALESCE(v_payment.metadata->'products', '[]'::jsonb)
    );
  END IF;

  IF p_action = 'release_wallee' THEN
    IF p_claim_token IS NULL
      OR v_payment.metadata->>'wallee_claim_token' IS DISTINCT FROM p_claim_token
    THEN
      RAISE EXCEPTION 'invalid_claim';
    END IF;
    IF v_payment.wallee_transaction_id IS NULL THEN
      UPDATE public.payments
      SET metadata = (COALESCE(metadata, '{}'::jsonb) - 'wallee_claim_at') - 'wallee_claim_token',
          updated_at = v_now
      WHERE id = v_payment_id AND tenant_id = v_tenant;
    END IF;
    RETURN jsonb_build_object('ok', true, 'released', true, 'payment_id', v_payment_id);
  END IF;

  IF p_action = 'attach_wallee' THEN
    IF p_claim_token IS NULL OR p_claim_token = '' THEN
      RAISE EXCEPTION 'invalid_wallee_transaction';
    END IF;
    UPDATE public.payments
    SET wallee_transaction_id = COALESCE(wallee_transaction_id, p_claim_token),
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('wallee_transaction_id', COALESCE(wallee_transaction_id, p_claim_token)),
        updated_at = v_now
    WHERE id = v_payment_id
      AND tenant_id = v_tenant
      AND metadata->>'source' = 'staff_product_sale';
    RETURN jsonb_build_object(
      'ok', true,
      'payment_id', v_payment_id,
      'wallee_transaction_id', COALESCE(v_payment.wallee_transaction_id, p_claim_token)
    );
  END IF;

  IF p_action = 'complete' THEN
    IF v_payment.appointment_id IS NOT NULL THEN
      RAISE EXCEPTION 'invalid_payment';
    END IF;
    IF v_payment.payment_method IS DISTINCT FROM 'deferred' THEN
      RAISE EXCEPTION 'invalid_method';
    END IF;
    IF v_fulfillment IS DISTINCT FROM 'deferred' THEN
      RAISE EXCEPTION 'invalid_fulfillment';
    END IF;
    IF v_payment.payment_status = 'completed' THEN
      v_completion_replay := true;
    ELSIF v_payment.payment_status IS DISTINCT FROM 'pending' THEN
      RAISE EXCEPTION 'invalid_transition';
    ELSE
      UPDATE public.payments
      SET payment_status = 'completed',
          paid_at = v_now,
          amount_paid_rappen = v_payment.total_amount_rappen,
          updated_at = v_now
      WHERE id = v_payment_id
        AND tenant_id = v_tenant
        AND payment_status = 'pending'
        AND payment_method = 'deferred'
        AND appointment_id IS NULL
        AND metadata->>'source' = 'staff_product_sale'
        AND metadata->>'fulfillment' = 'deferred';
      IF NOT FOUND THEN
        RAISE EXCEPTION 'invalid_transition';
      END IF;
      v_payment.payment_status := 'completed';
    END IF;
  END IF;

  -- apply_credit
  -- Sending an invoice is not a payment. sent_at does not authorize credit.
  IF p_actor_user_id IS NULL AND v_fulfillment IS DISTINCT FROM 'wallee' THEN
    RAISE EXCEPTION 'forbidden_actor' USING ERRCODE = '42501';
  END IF;
  IF v_fulfillment NOT IN ('cash', 'deferred', 'invoice', 'invoice_send', 'wallee') THEN
    RAISE EXCEPTION 'invalid_method';
  END IF;
  IF v_payment.payment_status IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION 'payment_not_completed';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('staff-pos-credit'), hashtext(v_payment_id::text));

  IF EXISTS (
    SELECT 1 FROM public.credit_transactions
    WHERE reference_id = v_payment_id
      AND reference_type = 'payment'
      AND transaction_type = 'credit_product_purchase'
  ) THEN
    RETURN jsonb_build_object(
      'ok', true, 'credit_applied', true, 'replayed', true,
      'payment_id', v_payment_id, 'payment_status', v_payment.payment_status, 'credit_rappen', 0
    );
  END IF;

  -- apply_credit uses the sale snapshot only. Live products.credit_amount_rappen is not a source.
  v_credit := 0;
  FOR v_item IN
    SELECT value FROM jsonb_array_elements(COALESCE(v_payment.metadata->'products', '[]'::jsonb)) AS t(value)
  LOOP
    v_qty := (v_item->>'quantity')::integer;
    IF v_qty < 1 OR v_qty > 100 THEN
      RAISE EXCEPTION 'invalid_quantity';
    END IF;
    IF COALESCE(v_item->>'is_credit_product', '') IN ('true', 't') THEN
      v_credit_unit := COALESCE((v_item->>'credit_amount_rappen')::integer, 0);
      IF v_credit_unit <= 0 THEN
        RAISE EXCEPTION 'zero_credit_snapshot';
      END IF;
      IF v_credit + (v_credit_unit::bigint * v_qty::bigint) > 2147483647 THEN
        RAISE EXCEPTION 'overflow';
      END IF;
      v_credit := v_credit + (v_credit_unit::bigint * v_qty::bigint);
    END IF;
  END LOOP;

  IF v_credit <= 0 THEN
    RETURN jsonb_build_object(
      'ok', true, 'credit_applied', false, 'replayed', v_completion_replay,
      'payment_id', v_payment_id, 'payment_status', v_payment.payment_status, 'credit_rappen', 0
    );
  END IF;

  BEGIN
    SELECT balance_rappen INTO v_before
    FROM public.student_credits
    WHERE user_id = v_payment.user_id AND tenant_id = v_tenant
    FOR UPDATE;
    IF NOT FOUND THEN
      INSERT INTO public.student_credits (user_id, tenant_id, balance_rappen, notes, updated_at)
      VALUES (v_payment.user_id, v_tenant, 0, 'Produktverkauf', v_now);
      v_before := 0;
    END IF;
    v_after := v_before + v_credit::integer;
    UPDATE public.student_credits
    SET balance_rappen = v_after, updated_at = v_now
    WHERE user_id = v_payment.user_id AND tenant_id = v_tenant;

    INSERT INTO public.credit_transactions (
      user_id, tenant_id, transaction_type, amount_rappen,
      balance_before_rappen, balance_after_rappen,
      reference_id, reference_type, notes, created_by, created_at
    ) VALUES (
      v_payment.user_id, v_tenant, 'credit_product_purchase', v_credit::integer,
      v_before, v_after, v_payment_id, 'payment',
      'Produktverkauf', p_actor_user_id, v_now
    );
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object(
        'ok', true, 'credit_applied', true, 'replayed', true,
        'payment_id', v_payment_id, 'payment_status', v_payment.payment_status, 'credit_rappen', 0
      );
  END;

  RETURN jsonb_build_object(
    'ok', true, 'credit_applied', true, 'replayed', false,
    'payment_id', v_payment_id, 'payment_status', v_payment.payment_status, 'credit_rappen', v_credit
  );
END;
$fn$;

COMMENT ON FUNCTION public.staff_pos_sale(uuid, uuid, jsonb, text, text, text, uuid, text) IS
  'Staff POS product sale. Cash credits in the sale transaction. Invoice, invoice send, and deferred stay pending without credit until the payment is completed. Deferred completion is action complete. apply_credit reads only the stored snapshot and requires payment_status completed. Null actors may apply_credit only for completed Wallee sales. tenant_admin may apply_credit. complete stays admin, staff, or super_admin.';

REVOKE ALL ON FUNCTION public.staff_pos_sale(uuid, uuid, jsonb, text, text, text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.staff_pos_sale(uuid, uuid, jsonb, text, text, text, uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.staff_pos_sale(uuid, uuid, jsonb, text, text, text, uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.staff_pos_sale(uuid, uuid, jsonb, text, text, text, uuid, text) TO service_role;
