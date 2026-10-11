-- DRAFT remediation for environments that already applied
-- 20261011_invoice_create_with_settlement without request_hash / cash null-appt skip.
-- Do NOT apply from application code / cloud agents without explicit staging authorization.
-- Does not touch production. Does not backfill financial rows.
--
-- Rollout prerequisites (staging):
--   1) 20261011_invoice_create_with_settlement already applied
--   2) 20261006_invoice_item_line_snapshot already applied
--   3) Apply THIS file only on verified non-prod (simy-test / kssqalisscxkhvorqwgy)
--
-- Changes:
--   * invoice_create_idempotency.request_hash (additive, nullable for legacy rows)
--   * invoice_create_settlement_request_hash + create_invoice_with_settlement REPLACE
--   * create_cash_transaction_from_payment: skip when appointment_id IS NULL
--     (matches 20261004_cash_ledger_foundation / staff POS contract)

ALTER TABLE public.invoice_create_idempotency
  ADD COLUMN IF NOT EXISTS request_hash text;

COMMENT ON COLUMN public.invoice_create_idempotency.request_hash IS
  'md5 of canonical settle request (invoice+items+settlements). Same key + different hash → idempotency_conflict.';

-- Align payment→cash trigger with established contract (20261001/20261004):
-- no appointment ⇒ skip ledger (POS/product cash creates its own row).
-- Minimal REPLACE: keep existing insert shape; do not require foundation columns.
-- Does not invent instructor_id / appointment_id. Does not suppress genuine errors.
CREATE OR REPLACE FUNCTION public.create_cash_transaction_from_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $function$
DECLARE
  v_appointment_data RECORD;
  v_instructor_id UUID;
BEGIN
  IF NEW.appointment_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.payment_method = 'cash' AND NEW.payment_status = 'completed' THEN
    SELECT
      user_id AS student_id,
      staff_id AS instructor_id,
      id AS appointment_id
    INTO v_appointment_data
    FROM appointments
    WHERE id = NEW.appointment_id;

    IF v_appointment_data.instructor_id IS NULL THEN
      v_instructor_id := auth.uid();
    ELSE
      v_instructor_id := v_appointment_data.instructor_id;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM cash_transactions
      WHERE appointment_id = NEW.appointment_id
        AND status != 'disputed'
    ) THEN
      INSERT INTO cash_transactions (
        instructor_id,
        student_id,
        appointment_id,
        amount_rappen,
        notes,
        status
      ) VALUES (
        v_instructor_id,
        v_appointment_data.student_id,
        v_appointment_data.appointment_id,
        NEW.total_amount_rappen,
        CONCAT('Automatisch erstellt aus Payment ID: ', NEW.id),
        'pending'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.create_cash_transaction_from_payment() IS
  'Creates pending cash_transaction for completed appointment cash payments. Skips appointment_id IS NULL.';


-- Canonical semantic payload hash (deterministic jsonb key order + strip_nulls).
CREATE OR REPLACE FUNCTION public.invoice_create_settlement_request_hash(
  p_invoice jsonb,
  p_items jsonb,
  p_settlements jsonb
) RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO pg_catalog, public
AS $hash$
DECLARE
  v_invoice jsonb;
  v_items jsonb := '[]'::jsonb;
  v_settlements jsonb := '[]'::jsonb;
  v_elem jsonb;
  v_ord integer;
BEGIN
  v_invoice := jsonb_strip_nulls(jsonb_build_object(
    'document_kind', NULLIF(p_invoice->>'document_kind', ''),
    'billing_type', NULLIF(p_invoice->>'billing_type', ''),
    'billing_company_name', NULLIF(p_invoice->>'billing_company_name', ''),
    'billing_contact_person', NULLIF(p_invoice->>'billing_contact_person', ''),
    'billing_email', NULLIF(p_invoice->>'billing_email', ''),
    'billing_street', NULLIF(p_invoice->>'billing_street', ''),
    'billing_street_number', NULLIF(p_invoice->>'billing_street_number', ''),
    'billing_zip', NULLIF(p_invoice->>'billing_zip', ''),
    'billing_city', NULLIF(p_invoice->>'billing_city', ''),
    'billing_country', NULLIF(p_invoice->>'billing_country', ''),
    'billing_vat_number', NULLIF(p_invoice->>'billing_vat_number', ''),
    'status', NULLIF(p_invoice->>'status', ''),
    'notes', NULLIF(p_invoice->>'notes', ''),
    'payment_terms', NULLIF(p_invoice->>'payment_terms', ''),
    'footer_text', NULLIF(p_invoice->>'footer_text', ''),
    'internal_notes', NULLIF(p_invoice->>'internal_notes', ''),
    'invoice_date', NULLIF(p_invoice->>'invoice_date', ''),
    'due_date', NULLIF(p_invoice->>'due_date', ''),
    'valid_until', NULLIF(p_invoice->>'valid_until', ''),
    'vat_rate', CASE WHEN NULLIF(p_invoice->>'vat_rate', '') IS NULL THEN NULL ELSE (p_invoice->>'vat_rate')::numeric END,
    'subtotal_rappen', CASE WHEN NULLIF(p_invoice->>'subtotal_rappen', '') IS NULL THEN NULL ELSE (p_invoice->>'subtotal_rappen')::bigint END,
    'vat_amount_rappen', CASE WHEN NULLIF(p_invoice->>'vat_amount_rappen', '') IS NULL THEN NULL ELSE (p_invoice->>'vat_amount_rappen')::bigint END,
    'discount_amount_rappen', CASE WHEN NULLIF(p_invoice->>'discount_amount_rappen', '') IS NULL THEN NULL ELSE (p_invoice->>'discount_amount_rappen')::bigint END,
    'total_amount_rappen', CASE WHEN NULLIF(p_invoice->>'total_amount_rappen', '') IS NULL THEN NULL ELSE (p_invoice->>'total_amount_rappen')::bigint END,
    'user_id', NULLIF(p_invoice->>'user_id', ''),
    'company_id', NULLIF(p_invoice->>'company_id', ''),
    'staff_id', NULLIF(p_invoice->>'staff_id', ''),
    'product_sale_id', NULLIF(p_invoice->>'product_sale_id', ''),
    'appointment_id', NULLIF(p_invoice->>'appointment_id', '')
  ));

  IF jsonb_typeof(p_items) = 'array' THEN
    FOR v_elem, v_ord IN
      SELECT value, ordinality
      FROM jsonb_array_elements(p_items) WITH ORDINALITY AS t(value, ordinality)
    LOOP
      v_items := v_items || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
        'ord', v_ord,
        'product_id', NULLIF(v_elem->>'product_id', ''),
        'product_name', NULLIF(v_elem->>'product_name', ''),
        'product_description', NULLIF(v_elem->>'product_description', ''),
        'appointment_id', NULLIF(v_elem->>'appointment_id', ''),
        'appointment_title', NULLIF(v_elem->>'appointment_title', ''),
        'appointment_date', NULLIF(v_elem->>'appointment_date', ''),
        'appointment_duration_minutes', CASE WHEN NULLIF(v_elem->>'appointment_duration_minutes', '') IS NULL THEN NULL ELSE (v_elem->>'appointment_duration_minutes')::integer END,
        'quantity', CASE WHEN NULLIF(v_elem->>'quantity', '') IS NULL THEN NULL ELSE (v_elem->>'quantity')::numeric END,
        'unit_price_rappen', CASE WHEN NULLIF(v_elem->>'unit_price_rappen', '') IS NULL THEN NULL ELSE (v_elem->>'unit_price_rappen')::bigint END,
        'total_price_rappen', CASE WHEN NULLIF(v_elem->>'total_price_rappen', '') IS NULL THEN NULL ELSE (v_elem->>'total_price_rappen')::bigint END,
        'vat_rate', CASE WHEN NULLIF(v_elem->>'vat_rate', '') IS NULL THEN NULL ELSE (v_elem->>'vat_rate')::numeric END,
        'vat_amount_rappen', CASE WHEN NULLIF(v_elem->>'vat_amount_rappen', '') IS NULL THEN NULL ELSE (v_elem->>'vat_amount_rappen')::bigint END,
        'sort_order', CASE WHEN NULLIF(v_elem->>'sort_order', '') IS NULL THEN NULL ELSE (v_elem->>'sort_order')::integer END,
        'notes', NULLIF(v_elem->>'notes', ''),
        'payment_id', NULLIF(v_elem->>'payment_id', ''),
        'linked_payment_id', NULLIF(v_elem->>'linked_payment_id', ''),
        'event_type_code', NULLIF(v_elem->>'event_type_code', ''),
        'user_id', NULLIF(v_elem->>'user_id', ''),
        'staff_id', NULLIF(v_elem->>'staff_id', ''),
        'staff_first_name', NULLIF(v_elem->>'staff_first_name', ''),
        'customer_first_name', NULLIF(v_elem->>'customer_first_name', ''),
        'customer_last_name', NULLIF(v_elem->>'customer_last_name', ''),
        'credit_to_wallet', CASE WHEN NULLIF(v_elem->>'credit_to_wallet', '') IS NULL THEN NULL ELSE (v_elem->>'credit_to_wallet')::boolean END,
        'credit_amount_rappen', CASE WHEN NULLIF(v_elem->>'credit_amount_rappen', '') IS NULL THEN NULL ELSE (v_elem->>'credit_amount_rappen')::bigint END
      )));
    END LOOP;
  END IF;

  IF jsonb_typeof(COALESCE(p_settlements, '[]'::jsonb)) = 'array' THEN
    FOR v_elem, v_ord IN
      SELECT value, ordinality
      FROM jsonb_array_elements(COALESCE(p_settlements, '[]'::jsonb)) WITH ORDINALITY AS t(value, ordinality)
    LOOP
      v_settlements := v_settlements || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
        'ord', v_ord,
        'item_index', CASE WHEN NULLIF(v_elem->>'item_index', '') IS NULL THEN NULL ELSE (v_elem->>'item_index')::integer END,
        'payment_method', lower(NULLIF(v_elem->>'payment_method', '')),
        'payment_date', NULLIF(v_elem->>'payment_date', ''),
        'amount_rappen', CASE WHEN NULLIF(v_elem->>'amount_rappen', '') IS NULL THEN NULL ELSE (v_elem->>'amount_rappen')::bigint END,
        'linked_payment_id', NULLIF(v_elem->>'linked_payment_id', ''),
        'notes', NULLIF(v_elem->>'notes', '')
      )));
    END LOOP;
  END IF;

  RETURN md5(jsonb_build_object(
    'invoice', v_invoice,
    'items', v_items,
    'settlements', v_settlements
  )::text);
END;
$hash$;

REVOKE ALL ON FUNCTION public.invoice_create_settlement_request_hash(jsonb, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.invoice_create_settlement_request_hash(jsonb, jsonb, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.invoice_create_settlement_request_hash(jsonb, jsonb, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.invoice_create_settlement_request_hash(jsonb, jsonb, jsonb) TO service_role;

-- 3) Atomic create + optional line settlements
CREATE OR REPLACE FUNCTION public.create_invoice_with_settlement(
  p_actor_user_id uuid,
  p_idempotency_key text,
  p_invoice jsonb,
  p_items jsonb,
  p_settlements jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $fn$
DECLARE
  v_actor public.users%ROWTYPE;
  v_tenant uuid;
  v_has_settlements boolean;
  v_invoice_id uuid;
  v_invoice_number text;
  v_item jsonb;
  v_settle jsonb;
  v_item_ids uuid[] := ARRAY[]::uuid[];
  v_item_id uuid;
  v_item_idx integer;
  v_line_total integer;
  v_method text;
  v_paid_at timestamptz;
  v_amount integer;
  v_linked_payment_id uuid;
  v_payment public.payments%ROWTYPE;
  v_paid_total bigint := 0;
  v_invoice_total integer;
  v_payment_status text;
  v_invoice_status text;
  v_now timestamptz := pg_catalog.now();
  v_replayed boolean := false;
  v_result jsonb;
  v_settled_item_ids uuid[] := ARRAY[]::uuid[];
  v_notes text;
  v_request_hash text;
  v_existing_hash text;
BEGIN
  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'forbidden_actor' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_actor FROM public.users WHERE id = p_actor_user_id FOR SHARE;
  IF NOT FOUND
    OR v_actor.deleted_at IS NOT NULL
    OR v_actor.is_active IS FALSE
    OR v_actor.tenant_id IS NULL
  THEN
    RAISE EXCEPTION 'forbidden_actor' USING ERRCODE = '42501';
  END IF;

  IF v_actor.role NOT IN ('admin', 'staff', 'tenant_admin') THEN
    RAISE EXCEPTION 'forbidden_role' USING ERRCODE = '42501';
  END IF;

  v_tenant := v_actor.tenant_id;
  v_has_settlements := jsonb_typeof(p_settlements) = 'array' AND jsonb_array_length(p_settlements) > 0;

  IF v_has_settlements AND v_actor.role NOT IN ('admin', 'tenant_admin') THEN
    RAISE EXCEPTION 'forbidden_settle_role' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(p_invoice) <> 'object' OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) < 1 THEN
    RAISE EXCEPTION 'invalid_payload';
  END IF;

  IF (p_invoice->>'tenant_id') IS NOT NULL AND (p_invoice->>'tenant_id')::uuid IS DISTINCT FROM v_tenant THEN
    RAISE EXCEPTION 'forbidden_tenant' USING ERRCODE = '42501';
  END IF;

  v_invoice_total := COALESCE((p_invoice->>'total_amount_rappen')::integer, 0);
  IF v_invoice_total < 0 THEN
    RAISE EXCEPTION 'invalid_total';
  END IF;

  v_request_hash := public.invoice_create_settlement_request_hash(
    p_invoice,
    p_items,
    COALESCE(p_settlements, '[]'::jsonb)
  );

  IF v_has_settlements THEN
    IF p_idempotency_key IS NULL
      OR p_idempotency_key !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    THEN
      RAISE EXCEPTION 'invalid_idempotency_key';
    END IF;

    -- Serialize concurrent retries / conflicting payloads for the same tenant key
    PERFORM pg_advisory_xact_lock(hashtext(v_tenant::text), hashtext(p_idempotency_key));

    SELECT i.invoice_id, i.request_hash
      INTO v_invoice_id, v_existing_hash
    FROM public.invoice_create_idempotency i
    WHERE i.tenant_id = v_tenant
      AND i.idempotency_key = p_idempotency_key;

    IF FOUND THEN
      IF v_existing_hash IS DISTINCT FROM v_request_hash THEN
        RAISE EXCEPTION 'idempotency_conflict'
          USING ERRCODE = '23505',
                DETAIL = 'same idempotency_key with different request payload';
      END IF;

      v_replayed := true;
      SELECT jsonb_build_object(
        'ok', true,
        'replayed', true,
        'invoice_id', inv.id,
        'invoice_number', inv.invoice_number,
        'paid_amount_rappen', inv.paid_amount_rappen,
        'payment_status', inv.payment_status,
        'total_amount_rappen', inv.total_amount_rappen,
        'outstanding_rappen', GREATEST(0, inv.total_amount_rappen - COALESCE(inv.paid_amount_rappen, 0))
      )
      INTO v_result
      FROM public.invoices inv
      WHERE inv.id = v_invoice_id
        AND inv.tenant_id = v_tenant;

      IF v_result IS NULL THEN
        RAISE EXCEPTION 'idempotency_orphan';
      END IF;
      RETURN v_result;
    END IF;
  END IF;

  -- Allocate number server-side (ignore client-supplied invoice_number)
  IF COALESCE(p_invoice->>'document_kind', 'invoice') = 'quote' THEN
    v_invoice_number := public.allocate_quote_number(v_tenant);
  ELSE
    v_invoice_number := public.allocate_invoice_number(v_tenant);
  END IF;

  INSERT INTO public.invoices (
    billing_type, billing_company_name, billing_contact_person, billing_email,
    billing_street, billing_street_number, billing_zip, billing_city, billing_country, billing_vat_number,
    tenant_id, document_kind, invoice_number, quote_number, valid_until, public_token,
    invoice_date, due_date, vat_rate,
    subtotal_rappen, vat_amount_rappen, discount_amount_rappen, total_amount_rappen,
    status, payment_status, paid_amount_rappen, paid_at,
    notes, payment_terms, footer_text, internal_notes,
    user_id, company_id, staff_id, product_sale_id, appointment_id
  ) VALUES (
    COALESCE(p_invoice->>'billing_type', 'individual'),
    NULLIF(p_invoice->>'billing_company_name', ''),
    NULLIF(p_invoice->>'billing_contact_person', ''),
    NULLIF(p_invoice->>'billing_email', ''),
    NULLIF(p_invoice->>'billing_street', ''),
    NULLIF(p_invoice->>'billing_street_number', ''),
    NULLIF(p_invoice->>'billing_zip', ''),
    NULLIF(p_invoice->>'billing_city', ''),
    COALESCE(NULLIF(p_invoice->>'billing_country', ''), 'CH'),
    NULLIF(p_invoice->>'billing_vat_number', ''),
    v_tenant,
    COALESCE(p_invoice->>'document_kind', 'invoice'),
    v_invoice_number,
    CASE WHEN COALESCE(p_invoice->>'document_kind', 'invoice') = 'quote' THEN v_invoice_number ELSE NULL END,
    NULLIF(p_invoice->>'valid_until', '')::date,
    CASE WHEN COALESCE(p_invoice->>'document_kind', 'invoice') = 'quote' THEN gen_random_uuid() ELSE NULL END,
    COALESCE(NULLIF(p_invoice->>'invoice_date', '')::date, CURRENT_DATE),
    COALESCE(NULLIF(p_invoice->>'due_date', '')::date, CURRENT_DATE),
    COALESCE((p_invoice->>'vat_rate')::numeric, 0),
    COALESCE((p_invoice->>'subtotal_rappen')::integer, 0),
    COALESCE((p_invoice->>'vat_amount_rappen')::integer, 0),
    COALESCE((p_invoice->>'discount_amount_rappen')::integer, 0),
    v_invoice_total,
    COALESCE(p_invoice->>'status', 'pdf_created'),
    'pending',
    0,
    NULL,
    NULLIF(p_invoice->>'notes', ''),
    NULLIF(p_invoice->>'payment_terms', ''),
    NULLIF(p_invoice->>'footer_text', ''),
    NULLIF(p_invoice->>'internal_notes', ''),
    NULLIF(p_invoice->>'user_id', '')::uuid,
    NULLIF(p_invoice->>'company_id', '')::uuid,
    COALESCE(NULLIF(p_invoice->>'staff_id', '')::uuid, v_actor.id),
    NULLIF(p_invoice->>'product_sale_id', '')::uuid,
    NULLIF(p_invoice->>'appointment_id', '')::uuid
  )
  RETURNING id INTO v_invoice_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) AS t(value)
  LOOP
    INSERT INTO public.invoice_items (
      invoice_id, tenant_id,
      product_id, product_name, product_description,
      appointment_id, appointment_title, appointment_date, appointment_duration_minutes,
      quantity, unit_price_rappen, total_price_rappen,
      vat_rate, vat_amount_rappen, sort_order, notes,
      payment_id,
      event_type_code, user_id, staff_id,
      staff_first_name, customer_first_name, customer_last_name,
      credit_to_wallet, credit_amount_rappen
    ) VALUES (
      v_invoice_id,
      v_tenant,
      NULLIF(v_item->>'product_id', '')::uuid,
      COALESCE(v_item->>'product_name', ''),
      NULLIF(v_item->>'product_description', ''),
      NULLIF(v_item->>'appointment_id', '')::uuid,
      NULLIF(v_item->>'appointment_title', ''),
      NULLIF(v_item->>'appointment_date', '')::timestamptz,
      NULLIF(v_item->>'appointment_duration_minutes', '')::integer,
      COALESCE((v_item->>'quantity')::numeric, 1),
      COALESCE((v_item->>'unit_price_rappen')::integer, 0),
      COALESCE((v_item->>'total_price_rappen')::integer, 0),
      COALESCE((v_item->>'vat_rate')::numeric, 0),
      COALESCE((v_item->>'vat_amount_rappen')::integer, 0),
      COALESCE((v_item->>'sort_order')::integer, 0),
      NULLIF(v_item->>'notes', ''),
      NULLIF(v_item->>'payment_id', '')::uuid,
      NULLIF(v_item->>'event_type_code', ''),
      NULLIF(v_item->>'user_id', '')::uuid,
      NULLIF(v_item->>'staff_id', '')::uuid,
      NULLIF(v_item->>'staff_first_name', ''),
      NULLIF(v_item->>'customer_first_name', ''),
      NULLIF(v_item->>'customer_last_name', ''),
      COALESCE((v_item->>'credit_to_wallet')::boolean, false),
      CASE WHEN COALESCE((v_item->>'credit_to_wallet')::boolean, false)
        THEN NULLIF(v_item->>'credit_amount_rappen', '')::integer
        ELSE NULL
      END
    )
    RETURNING id INTO v_item_id;

    v_item_ids := array_append(v_item_ids, v_item_id);

    -- Claim unpaid open-item linked payments as invoiced (not completed)
    v_linked_payment_id := NULLIF(v_item->>'linked_payment_id', '')::uuid;
    IF v_linked_payment_id IS NOT NULL
       AND COALESCE(p_invoice->>'document_kind', 'invoice') <> 'quote'
    THEN
      -- Skip if this index will be settled below (settlements handled separately)
      NULL; -- claim happens after we know settlement set
    END IF;
  END LOOP;

  -- Collect settled indices first
  IF v_has_settlements THEN
    FOR v_settle IN SELECT value FROM jsonb_array_elements(p_settlements) AS t(value)
    LOOP
      v_item_idx := (v_settle->>'item_index')::integer;
      IF v_item_idx IS NULL OR v_item_idx < 0 OR v_item_idx >= array_length(v_item_ids, 1) THEN
        RAISE EXCEPTION 'invalid_settlement_index';
      END IF;

      v_item_id := v_item_ids[v_item_idx + 1];
      IF v_item_id = ANY (v_settled_item_ids) THEN
        RAISE EXCEPTION 'duplicate_settlement_item';
      END IF;
      v_settled_item_ids := array_append(v_settled_item_ids, v_item_id);

      SELECT total_price_rappen INTO v_line_total
      FROM public.invoice_items
      WHERE id = v_item_id AND invoice_id = v_invoice_id AND tenant_id = v_tenant;

      v_amount := COALESCE((v_settle->>'amount_rappen')::integer, v_line_total);
      IF v_amount IS DISTINCT FROM v_line_total OR v_amount <= 0 THEN
        RAISE EXCEPTION 'invalid_settlement_amount';
      END IF;

      v_method := lower(COALESCE(v_settle->>'payment_method', ''));
      IF v_method NOT IN ('cash', 'twint', 'bank_transfer', 'card_terminal') THEN
        RAISE EXCEPTION 'invalid_payment_method';
      END IF;

      v_paid_at := COALESCE(NULLIF(v_settle->>'payment_date', '')::timestamptz, v_now);
      v_linked_payment_id := NULLIF(v_settle->>'linked_payment_id', '')::uuid;
      v_notes := NULLIF(v_settle->>'notes', '');

      INSERT INTO public.invoice_payments (
        invoice_id, tenant_id, invoice_item_id,
        amount_rappen, payment_date, payment_method, notes, status, currency
      ) VALUES (
        v_invoice_id, v_tenant, v_item_id,
        v_amount, v_paid_at, v_method, v_notes, 'completed', 'CHF'
      );

      v_paid_total := v_paid_total + v_amount;

      IF v_linked_payment_id IS NOT NULL THEN
        SELECT * INTO v_payment
        FROM public.payments
        WHERE id = v_linked_payment_id
          AND tenant_id = v_tenant
        FOR UPDATE;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'invalid_linked_payment';
        END IF;

        -- Complete with chosen method (never stamp as invoice first)
        UPDATE public.payments
        SET invoice_id = v_invoice_id,
            payment_status = 'completed',
            payment_method = v_method,
            paid_at = v_paid_at,
            updated_at = v_now
        WHERE id = v_linked_payment_id
          AND tenant_id = v_tenant
          AND payment_status IS DISTINCT FROM 'cancelled'
          AND payment_status IS DISTINCT FROM 'refunded'
          AND payment_status IS DISTINCT FROM 'completed';
        -- If already completed, still attach invoice_id if missing
        UPDATE public.payments
        SET invoice_id = COALESCE(invoice_id, v_invoice_id),
            updated_at = v_now
        WHERE id = v_linked_payment_id
          AND tenant_id = v_tenant
          AND invoice_id IS NULL;
      END IF;
    END LOOP;
  END IF;

  -- Claim remaining linked payments as invoiced (unpaid lines only)
  v_item_idx := 0;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) AS t(value)
  LOOP
    v_item_id := v_item_ids[v_item_idx + 1];
    v_linked_payment_id := NULLIF(v_item->>'linked_payment_id', '')::uuid;
    IF v_linked_payment_id IS NOT NULL
       AND NOT (v_item_id = ANY (v_settled_item_ids))
       AND COALESCE(p_invoice->>'document_kind', 'invoice') <> 'quote'
    THEN
      UPDATE public.payments
      SET invoice_id = v_invoice_id,
          payment_status = 'invoiced',
          payment_method = 'invoice',
          updated_at = v_now
      WHERE id = v_linked_payment_id
        AND tenant_id = v_tenant
        AND invoice_id IS NULL
        AND payment_status IS DISTINCT FROM 'cancelled'
        AND payment_status IS DISTINCT FROM 'completed'
        AND payment_status IS DISTINCT FROM 'refunded';
    END IF;
    v_item_idx := v_item_idx + 1;
  END LOOP;

  IF v_paid_total > v_invoice_total THEN
    RAISE EXCEPTION 'overpayment';
  END IF;

  IF v_paid_total = 0 THEN
    v_payment_status := 'pending';
    v_invoice_status := COALESCE(p_invoice->>'status', 'pdf_created');
  ELSIF v_paid_total < v_invoice_total THEN
    v_payment_status := 'partial';
    v_invoice_status := 'sent';
  ELSE
    v_payment_status := 'paid';
    v_invoice_status := 'paid';
  END IF;

  UPDATE public.invoices
  SET paid_amount_rappen = v_paid_total::integer,
      payment_status = v_payment_status,
      status = v_invoice_status,
      paid_at = CASE WHEN v_paid_total > 0 THEN v_now ELSE NULL END,
      dunning_level = CASE WHEN v_payment_status = 'paid' THEN 0 ELSE dunning_level END,
      dunning_paused = CASE WHEN v_payment_status = 'paid' THEN false ELSE dunning_paused END,
      updated_at = v_now
  WHERE id = v_invoice_id
    AND tenant_id = v_tenant;

  -- Required audit trail inside the same transaction
  INSERT INTO public.audit_logs (
    user_id, action, resource_type, resource_id, status, details, tenant_id, created_at
  ) VALUES (
    v_actor.id,
    'invoice_create_with_settlement',
    'invoice',
    v_invoice_id,
    'success',
    jsonb_build_object(
      'invoice_number', v_invoice_number,
      'idempotency_key', p_idempotency_key,
      'request_hash', v_request_hash,
      'paid_amount_rappen', v_paid_total,
      'total_amount_rappen', v_invoice_total,
      'settlement_count', COALESCE(jsonb_array_length(p_settlements), 0),
      'settled_item_ids', to_jsonb(v_settled_item_ids),
      'payment_status', v_payment_status
    ),
    v_tenant,
    v_now
  );

  IF v_has_settlements THEN
    INSERT INTO public.invoice_create_idempotency (
      tenant_id, idempotency_key, invoice_id, actor_user_id, request_hash
    ) VALUES (
      v_tenant, p_idempotency_key, v_invoice_id, v_actor.id, v_request_hash
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'replayed', false,
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number,
    'paid_amount_rappen', v_paid_total,
    'payment_status', v_payment_status,
    'total_amount_rappen', v_invoice_total,
    'outstanding_rappen', GREATEST(0, v_invoice_total - v_paid_total)
  );
END;
$fn$;

COMMENT ON FUNCTION public.create_invoice_with_settlement(uuid, text, jsonb, jsonb, jsonb) IS
  'Atomically create invoice + items + optional per-line settlements. Service role only. Idempotent settle keys conflict on request_hash mismatch.';

REVOKE ALL ON FUNCTION public.create_invoice_with_settlement(uuid, text, jsonb, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_invoice_with_settlement(uuid, text, jsonb, jsonb, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.create_invoice_with_settlement(uuid, text, jsonb, jsonb, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_invoice_with_settlement(uuid, text, jsonb, jsonb, jsonb) TO service_role;
