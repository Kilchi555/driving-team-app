-- Payment settlement atomicity — 2026-10-16
-- Create only. Do not apply automatically to production.
-- Does not change grants on tables, RLS, or default privileges.
-- Does not GRANT to anon or authenticated.
-- service_role may EXECUTE these functions. Each function runs as one
-- transaction: an exception rolls back every write it made.
--
-- Amount rules copied from the handlers, not redefined:
--   mark-paid does not write invoices.paid_amount_rappen or invoice_payments.
--   A requested invoice amount of NULL or 0 books the invoice total
--   (the existing || expression; invoice_payments.amount_rappen must be > 0).
--   The invoice header stores least(previous + requested, total).
--   The journal stores the requested amount, which can exceed the remainder.
--   That header/journal split is preserved. It is not reconciled here.
--   A manual repeat against an already fully paid invoice does not insert
--   another journal row. A new bank dedupe key still books.
--   A payments row that is already completed is not given another cash amount.
--
-- Sibling reads:
--   complete_tenant_cash_payment: an empty sibling set is all paid
--   (bool_and of no rows is null, coalesced to true — the same result as
--   [].every).
--   apply_cash_settlement_batch: an empty sibling set is not all paid
--   (the bulk handler required a non-empty list).

BEGIN;

CREATE OR REPLACE FUNCTION public.complete_tenant_cash_payment(
  p_actor_user_id uuid,
  p_payment_id uuid,
  p_paid_at timestamptz
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $fn$
DECLARE
  v_actor public.users%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_invoice_id uuid;
  v_all_paid boolean;
  v_now timestamptz := COALESCE(p_paid_at, pg_catalog.now());
  v_replayed boolean := false;
BEGIN
  SELECT * INTO v_actor
  FROM public.users
  WHERE id = p_actor_user_id;

  IF NOT FOUND
    OR v_actor.tenant_id IS NULL
    OR v_actor.role NOT IN ('admin', 'staff', 'tenant_admin')
  THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
    AND tenant_id = v_actor.tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF COALESCE(v_payment.metadata->>'source', '') = 'staff_product_sale' THEN
    RAISE EXCEPTION 'staff_pos_payment' USING ERRCODE = '23514';
  END IF;

  v_invoice_id := v_payment.invoice_id;
  IF v_invoice_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.invoices
      WHERE id = v_invoice_id
        AND tenant_id = v_actor.tenant_id
    )
  THEN
    RAISE EXCEPTION 'invoice_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_payment.payment_status = 'completed' AND v_payment.payment_method = 'cash' THEN
    v_replayed := true;
  ELSE
    UPDATE public.payments
    SET payment_status = 'completed',
        payment_method = 'cash',
        paid_at = v_now,
        updated_at = v_now
    WHERE id = v_payment.id
      AND tenant_id = v_actor.tenant_id;
  END IF;

  IF v_actor.role = 'admin' AND v_invoice_id IS NOT NULL THEN
    -- Empty sibling set: bool_and returns null, which means all paid.
    SELECT COALESCE(bool_and(p.payment_status = 'completed'), true)
      INTO v_all_paid
    FROM public.payments p
    WHERE p.invoice_id = v_invoice_id
      AND (p.tenant_id = v_actor.tenant_id OR p.tenant_id IS NULL);

    UPDATE public.invoices
    SET payment_status = CASE WHEN v_all_paid THEN 'paid' ELSE 'partial' END,
        paid_at = CASE WHEN v_all_paid THEN v_now ELSE paid_at END,
        updated_at = v_now
    WHERE id = v_invoice_id
      AND tenant_id = v_actor.tenant_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'invoice_not_found' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'payment_id', p_payment_id,
    'replayed', v_replayed,
    'invoice_payment_status', CASE
      WHEN v_actor.role = 'admin' AND v_invoice_id IS NOT NULL AND v_all_paid THEN 'paid'
      WHEN v_actor.role = 'admin' AND v_invoice_id IS NOT NULL THEN 'partial'
      ELSE NULL
    END
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.settle_marked_invoice_payment(
  p_actor_user_id uuid,
  p_invoice_id uuid,
  p_paid_amount_rappen integer,
  p_paid_at timestamptz,
  p_note text,
  p_payment_method text,
  p_camt_dedupe_key text,
  p_camt_bank_ref text,
  p_camt_entry_date date,
  p_camt_reference text,
  p_camt_debtor_name text,
  p_import_source text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $fn$
DECLARE
  v_actor public.users%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_now timestamptz := pg_catalog.now();
  v_paid_at timestamptz := COALESCE(p_paid_at, v_now);
  v_requested integer;
  v_previous integer;
  v_clamped integer;
  v_partial boolean;
  v_method text;
  v_pay_id uuid;
BEGIN
  SELECT * INTO v_actor
  FROM public.users
  WHERE id = p_actor_user_id;

  IF NOT FOUND
    OR v_actor.tenant_id IS NULL
    OR v_actor.role NOT IN ('admin', 'tenant_admin')
  THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id = p_invoice_id
    AND tenant_id = v_actor.tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invoice_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_invoice.total_amount_rappen IS NULL THEN
    RAISE EXCEPTION 'invoice_total_missing' USING ERRCODE = '23514';
  END IF;

  -- NULL or 0 books the invoice total. Any other integer is the requested amount.
  IF p_paid_amount_rappen IS NULL OR p_paid_amount_rappen = 0 THEN
    v_requested := v_invoice.total_amount_rappen;
  ELSE
    v_requested := p_paid_amount_rappen;
  END IF;

  IF p_camt_dedupe_key IS NOT NULL AND btrim(p_camt_dedupe_key) <> '' THEN
    BEGIN
      INSERT INTO public.bank_import_records (
        tenant_id, dedupe_key, bank_ref, entry_date, amount_rappen,
        reference, debtor_name, invoice_id, imported_by, source
      ) VALUES (
        v_actor.tenant_id,
        p_camt_dedupe_key,
        NULLIF(p_camt_bank_ref, ''),
        p_camt_entry_date,
        v_requested,
        NULLIF(p_camt_reference, ''),
        NULLIF(p_camt_debtor_name, ''),
        p_invoice_id,
        v_actor.id,
        CASE WHEN p_import_source = 'csv' THEN 'csv' ELSE 'camt' END
      );
    EXCEPTION
      WHEN unique_violation THEN
        RAISE EXCEPTION 'duplicate_bank_import' USING ERRCODE = '23505';
    END;
  END IF;

  v_previous := COALESCE(v_invoice.paid_amount_rappen, 0);
  IF v_invoice.payment_status = 'paid'
    AND v_previous >= v_invoice.total_amount_rappen
    AND (p_camt_dedupe_key IS NULL OR btrim(p_camt_dedupe_key) = '')
  THEN
    RETURN jsonb_build_object(
      'ok', true,
      'replayed', true,
      'invoice_id', p_invoice_id,
      'paid_amount_rappen', v_previous,
      'is_partial', false
    );
  END IF;

  IF v_requested > 2147483647 - v_previous THEN
    RAISE EXCEPTION 'amount_overflow' USING ERRCODE = '22003';
  END IF;

  v_clamped := LEAST(v_previous + v_requested, v_invoice.total_amount_rappen);
  v_partial := v_clamped < v_invoice.total_amount_rappen;
  v_method := COALESCE(NULLIF(btrim(p_payment_method), ''), NULLIF(btrim(p_note), ''), 'manual');

  UPDATE public.invoices
  SET payment_status = CASE WHEN v_partial THEN 'partial' ELSE 'paid' END,
      status = CASE WHEN v_partial THEN 'sent' ELSE 'paid' END,
      paid_at = v_paid_at,
      paid_amount_rappen = v_clamped,
      internal_notes = CASE
        WHEN p_note IS NOT NULL AND btrim(p_note) <> '' THEN p_note
        ELSE internal_notes
      END,
      dunning_level = CASE WHEN v_partial THEN dunning_level ELSE 0 END,
      dunning_paused = CASE WHEN v_partial THEN dunning_paused ELSE false END,
      updated_at = v_now
  WHERE id = p_invoice_id
    AND tenant_id = v_actor.tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invoice_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.invoice_payments (
    invoice_id, tenant_id, amount_rappen, payment_date, payment_method,
    notes, status, currency
  ) VALUES (
    p_invoice_id,
    v_actor.tenant_id,
    v_requested,
    v_paid_at,
    v_method,
    NULLIF(p_note, ''),
    'completed',
    'CHF'
  );

  IF NOT v_partial THEN
    UPDATE public.payments
    SET payment_status = 'completed',
        paid_at = v_paid_at,
        updated_at = v_now
    WHERE invoice_id = p_invoice_id
      AND tenant_id = v_invoice.tenant_id
      AND payment_status IN ('invoice', 'invoiced', 'pending', 'open', 'failed', 'partial');

    IF v_invoice.user_id IS NOT NULL THEN
      UPDATE public.payments
      SET payment_status = 'completed',
          invoice_id = p_invoice_id,
          paid_at = v_paid_at,
          updated_at = v_now
      WHERE user_id = v_invoice.user_id
        AND tenant_id = v_invoice.tenant_id
        AND appointment_id IN (
          SELECT ii.appointment_id
          FROM public.invoice_items ii
          WHERE ii.invoice_id = p_invoice_id
            AND ii.appointment_id IS NOT NULL
            AND (ii.tenant_id = v_actor.tenant_id OR ii.tenant_id IS NULL)
        )
        AND payment_status IN ('invoice', 'invoiced', 'pending', 'open', 'failed', 'partial');
    END IF;

    FOR v_pay_id IN
      SELECT p.id
      FROM public.payments p
      WHERE p.invoice_id = p_invoice_id
        AND p.tenant_id = v_invoice.tenant_id
        AND COALESCE(p.metadata->>'source', '') = 'staff_product_sale'
    LOOP
      EXECUTE
        'SELECT public.staff_pos_sale($1, NULL::uuid, ''[]''::jsonb, NULL::text, NULL::text, ''apply_credit'', $2, NULL::text)'
        USING p_actor_user_id, v_pay_id;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'replayed', false,
    'invoice_id', p_invoice_id,
    'paid_amount_rappen', v_clamped,
    'is_partial', v_partial
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.apply_cash_settlement_batch(
  p_actor_user_id uuid,
  p_payment_updates jsonb,
  p_now timestamptz
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $fn$
DECLARE
  v_actor public.users%ROWTYPE;
  v_item jsonb;
  v_payment public.payments%ROWTYPE;
  v_now timestamptz := COALESCE(p_now, pg_catalog.now());
  v_invoice_id uuid;
  v_count integer;
  v_all_completed boolean;
  v_any_paid boolean;
  v_applied jsonb := '[]'::jsonb;
BEGIN
  IF jsonb_typeof(p_payment_updates) <> 'array' THEN
    RAISE EXCEPTION 'invalid_updates' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_actor
  FROM public.users
  WHERE id = p_actor_user_id;

  IF NOT FOUND
    OR v_actor.tenant_id IS NULL
    OR v_actor.is_active IS NOT TRUE
    OR v_actor.role NOT IN ('admin', 'staff', 'super_admin', 'tenant_admin')
  THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  FOR v_item IN
    SELECT value FROM jsonb_array_elements(p_payment_updates)
  LOOP
    SELECT * INTO v_payment
    FROM public.payments
    WHERE id = (v_item->>'payment_id')::uuid
      AND tenant_id = v_actor.tenant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'payment_not_found' USING ERRCODE = 'P0002';
    END IF;

    IF COALESCE(v_payment.metadata->>'source', '') = 'staff_product_sale' THEN
      RAISE EXCEPTION 'staff_pos_payment' USING ERRCODE = '23514';
    END IF;

    IF v_payment.payment_status = 'completed' THEN
      v_applied := v_applied || jsonb_build_array(jsonb_build_object(
        'payment_id', v_payment.id,
        'skipped', true
      ));
      CONTINUE;
    END IF;

    UPDATE public.payments
    SET payment_method = COALESCE(v_item->>'payment_method', 'cash'),
        payment_status = v_item->>'payment_status',
        amount_paid_rappen = (v_item->>'amount_paid_rappen')::integer,
        paid_at = CASE
          WHEN v_item->>'payment_status' = 'completed' THEN v_now
          ELSE paid_at
        END,
        metadata = CASE
          WHEN v_item ? 'metadata' AND v_item->'metadata' <> 'null'::jsonb THEN v_item->'metadata'
          ELSE metadata
        END,
        updated_at = v_now
    WHERE id = v_payment.id
      AND tenant_id = v_actor.tenant_id;

    v_applied := v_applied || jsonb_build_array(jsonb_build_object(
      'payment_id', v_payment.id,
      'skipped', false,
      'payment_status', v_item->>'payment_status'
    ));
  END LOOP;

  IF v_actor.role IN ('admin', 'tenant_admin', 'super_admin', 'superadmin') THEN
    FOR v_invoice_id IN
      SELECT DISTINCT p.invoice_id
      FROM public.payments p
      WHERE p.tenant_id = v_actor.tenant_id
        AND p.invoice_id IS NOT NULL
        AND p.id IN (
          SELECT (value->>'payment_id')::uuid
          FROM jsonb_array_elements(p_payment_updates)
        )
    LOOP
      SELECT COUNT(*),
             COALESCE(bool_and(p.payment_status = 'completed'), false),
             COALESCE(bool_or(p.payment_status IN ('completed', 'partial')), false)
        INTO v_count, v_all_completed, v_any_paid
      FROM public.payments p
      WHERE p.invoice_id = v_invoice_id
        AND (p.tenant_id = v_actor.tenant_id OR p.tenant_id IS NULL);

      IF v_any_paid THEN
        UPDATE public.invoices
        SET payment_status = CASE
              WHEN v_count > 0 AND v_all_completed THEN 'paid'
              ELSE 'partial'
            END,
            paid_at = CASE
              WHEN v_count > 0 AND v_all_completed THEN v_now
              ELSE paid_at
            END,
            updated_at = v_now
        WHERE id = v_invoice_id
          AND tenant_id = v_actor.tenant_id;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'invoice_not_in_tenant' USING ERRCODE = 'P0002';
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('ok', true, 'applied', v_applied);
END;
$fn$;

REVOKE ALL ON FUNCTION public.complete_tenant_cash_payment(uuid, uuid, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_tenant_cash_payment(uuid, uuid, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.complete_tenant_cash_payment(uuid, uuid, timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.complete_tenant_cash_payment(uuid, uuid, timestamptz) TO service_role;

REVOKE ALL ON FUNCTION public.settle_marked_invoice_payment(uuid, uuid, integer, timestamptz, text, text, text, text, date, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.settle_marked_invoice_payment(uuid, uuid, integer, timestamptz, text, text, text, text, date, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.settle_marked_invoice_payment(uuid, uuid, integer, timestamptz, text, text, text, text, date, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.settle_marked_invoice_payment(uuid, uuid, integer, timestamptz, text, text, text, text, date, text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.apply_cash_settlement_batch(uuid, jsonb, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_cash_settlement_batch(uuid, jsonb, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.apply_cash_settlement_batch(uuid, jsonb, timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_cash_settlement_batch(uuid, jsonb, timestamptz) TO service_role;

COMMENT ON FUNCTION public.complete_tenant_cash_payment(uuid, uuid, timestamptz) IS
  'Atomic admin/staff cash completion. Payment status and the admin invoice status commit together. Does not write paid_amount_rappen or invoice_payments.';

COMMENT ON FUNCTION public.settle_marked_invoice_payment(uuid, uuid, integer, timestamptz, text, text, text, text, date, text, text, text) IS
  'Atomic invoice header, journal, and open payment completion. A journal or staff-POS failure rolls the header back. Does not change the clamped-header versus requested-journal amounts.';

COMMENT ON FUNCTION public.apply_cash_settlement_batch(uuid, jsonb, timestamptz) IS
  'Atomic cash batch. An already completed payment is not rewritten. Invoice header sync for admin roles commits with the payment updates or the batch rolls back.';

COMMIT;
