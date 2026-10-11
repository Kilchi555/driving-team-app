-- Atomic core for mark-invoice-paid:
--   invoices + invoice_payments + optional bank_import_records + optional course_registrations
-- in ONE transaction. Does NOT write cash_transactions. Does NOT invent provider settlements.
-- Staff-POS credits / wallet credits / audit remain application-layer post-commit.
--
-- NOT applied to production by this PR; apply only via approved non-production then production rollout.

DROP FUNCTION IF EXISTS public.mark_invoice_paid_core(
  uuid, uuid, uuid, integer, integer, integer, boolean, timestamptz, text, text, text, text, uuid, integer
);

DROP FUNCTION IF EXISTS public.mark_invoice_paid_core(
  uuid, uuid, uuid, integer, integer, timestamptz, text, text, text, text, uuid,
  text, text, date, text, text, text
);

CREATE OR REPLACE FUNCTION public.mark_invoice_paid_core(
  p_tenant_id uuid,
  p_invoice_id uuid,
  p_actor_user_id uuid,
  p_expected_paid_amount_rappen integer,
  p_requested_payment_rappen integer,
  p_paid_at timestamptz,
  p_payment_method text,
  p_notes text,
  p_internal_notes text,
  p_settlement_source text,
  p_sync_registration_id uuid DEFAULT NULL,
  p_bank_dedupe_key text DEFAULT NULL,
  p_bank_ref text DEFAULT NULL,
  p_bank_entry_date date DEFAULT NULL,
  p_bank_reference text DEFAULT NULL,
  p_bank_debtor_name text DEFAULT NULL,
  p_bank_import_source text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_bank public.bank_import_records%ROWTYPE;
  v_payment_id uuid;
  v_bank_id uuid;
  v_reg_count integer;
  v_reg_id uuid;
  v_prev integer;
  v_total integer;
  v_remaining integer;
  v_new_payment integer;
  v_clamped_total integer;
  v_is_partial boolean;
  v_bank_key text;
  v_need_bank_insert boolean := false;
  v_payment_count integer;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'mark_invoice_paid_core_service_role_only' USING ERRCODE = '42501';
  END IF;

  IF p_tenant_id IS NULL OR p_invoice_id IS NULL OR p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'mark_invoice_paid_core_missing_args' USING ERRCODE = '22023';
  END IF;

  IF p_settlement_source IS NULL OR p_settlement_source NOT IN ('bank_import', 'manual_attestation') THEN
    RAISE EXCEPTION 'mark_invoice_paid_core_invalid_settlement_source' USING ERRCODE = '22023';
  END IF;

  IF p_requested_payment_rappen IS NULL OR p_requested_payment_rappen <= 0 THEN
    RAISE EXCEPTION 'mark_invoice_paid_core_invalid_amount' USING ERRCODE = '22023';
  END IF;

  v_bank_key := nullif(btrim(coalesce(p_bank_dedupe_key, '')), '');
  IF p_settlement_source = 'bank_import' AND v_bank_key IS NULL THEN
    RAISE EXCEPTION 'mark_invoice_paid_core_bank_key_required' USING ERRCODE = '22023';
  END IF;
  IF p_settlement_source <> 'bank_import' AND v_bank_key IS NOT NULL THEN
    RAISE EXCEPTION 'mark_invoice_paid_core_bank_key_not_allowed' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id = p_invoice_id
    AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'mark_invoice_paid_core_invoice_not_found' USING ERRCODE = 'P0002';
  END IF;

  v_prev := coalesce(v_invoice.paid_amount_rappen, 0);
  v_total := coalesce(v_invoice.total_amount_rappen, 0);

  IF v_prev < 0 OR v_total < 0 THEN
    RAISE EXCEPTION 'mark_invoice_paid_core_negative_balance' USING ERRCODE = '22023';
  END IF;

  -- Bank dedupe claim lives in the SAME transaction as settlement.
  IF v_bank_key IS NOT NULL THEN
    SELECT * INTO v_bank
    FROM public.bank_import_records
    WHERE tenant_id = p_tenant_id
      AND dedupe_key = v_bank_key
    FOR UPDATE;

    IF FOUND THEN
      IF v_bank.invoice_id IS DISTINCT FROM p_invoice_id THEN
        RAISE EXCEPTION 'mark_invoice_paid_core_bank_key_conflict_invoice' USING ERRCODE = 'P0001';
      END IF;

      SELECT COUNT(*) INTO v_payment_count
      FROM public.invoice_payments
      WHERE invoice_id = p_invoice_id
        AND tenant_id = p_tenant_id
        AND status = 'completed';

      -- Idempotent replay: same key + same invoice already has settlement evidence.
      IF v_payment_count > 0 AND v_prev > 0 THEN
        RETURN jsonb_build_object(
          'outcome', 'already_settled',
          'invoice_id', p_invoice_id,
          'invoice_payment_id', NULL,
          'bank_import_id', v_bank.id,
          'paid_amount_rappen', v_prev,
          'is_partial', CASE WHEN v_total > 0 AND v_prev < v_total THEN true ELSE false END,
          'settlement_source', p_settlement_source,
          'course_registration_id', NULL,
          'actor_user_id', p_actor_user_id,
          'idempotent', true
        );
      END IF;

      -- Dedupe row exists without successful settlement → safe resume (no second claim).
      IF v_payment_count = 0 AND v_prev = coalesce(p_expected_paid_amount_rappen, 0) THEN
        v_need_bank_insert := false;
      ELSIF v_payment_count = 0 THEN
        RAISE EXCEPTION 'mark_invoice_paid_core_bank_key_needs_reconciliation' USING ERRCODE = 'P0001';
      ELSE
        RAISE EXCEPTION 'mark_invoice_paid_core_bank_key_needs_reconciliation' USING ERRCODE = 'P0001';
      END IF;
    ELSE
      v_need_bank_insert := true;
    END IF;
  END IF;

  IF coalesce(v_prev, 0) <> coalesce(p_expected_paid_amount_rappen, 0) THEN
    RAISE EXCEPTION 'mark_invoice_paid_core_concurrent_modification' USING ERRCODE = '40001';
  END IF;

  IF v_total > 0 AND v_prev >= v_total THEN
    RAISE EXCEPTION 'mark_invoice_paid_core_already_paid' USING ERRCODE = 'P0001';
  END IF;

  v_remaining := greatest(v_total - v_prev, 0);
  IF p_requested_payment_rappen > v_remaining THEN
    RAISE EXCEPTION 'mark_invoice_paid_core_overpayment' USING ERRCODE = '22023';
  END IF;

  -- Derive money totals from the locked invoice row — never trust caller-supplied clamped totals.
  v_new_payment := p_requested_payment_rappen;
  v_clamped_total := v_prev + v_new_payment;
  v_is_partial := (v_total > 0 AND v_clamped_total < v_total);

  UPDATE public.invoices
  SET
    payment_status = CASE WHEN v_is_partial THEN 'partial' ELSE 'paid' END,
    status = CASE WHEN v_is_partial THEN 'sent' ELSE 'paid' END,
    paid_at = p_paid_at,
    paid_amount_rappen = v_clamped_total,
    internal_notes = COALESCE(p_internal_notes, internal_notes),
    dunning_level = CASE WHEN NOT v_is_partial THEN 0 ELSE dunning_level END,
    dunning_paused = CASE WHEN NOT v_is_partial THEN false ELSE dunning_paused END,
    updated_at = now()
  WHERE id = p_invoice_id
    AND tenant_id = p_tenant_id;

  INSERT INTO public.invoice_payments (
    invoice_id,
    tenant_id,
    amount_rappen,
    payment_date,
    payment_method,
    notes,
    status,
    currency
  ) VALUES (
    p_invoice_id,
    p_tenant_id,
    v_new_payment,
    p_paid_at,
    p_payment_method,
    p_notes,
    'completed',
    'CHF'
  )
  RETURNING id INTO v_payment_id;

  IF v_need_bank_insert THEN
    INSERT INTO public.bank_import_records (
      tenant_id,
      dedupe_key,
      bank_ref,
      entry_date,
      amount_rappen,
      reference,
      debtor_name,
      invoice_id,
      imported_by,
      source
    ) VALUES (
      p_tenant_id,
      v_bank_key,
      p_bank_ref,
      p_bank_entry_date,
      v_new_payment,
      p_bank_reference,
      p_bank_debtor_name,
      p_invoice_id,
      p_actor_user_id,
      CASE WHEN p_bank_import_source = 'csv' THEN 'csv' ELSE 'camt' END
    )
    RETURNING id INTO v_bank_id;
  ELSIF v_bank_key IS NOT NULL THEN
    v_bank_id := v_bank.id;
  END IF;

  v_reg_id := NULL;
  IF NOT v_is_partial THEN
    SELECT COUNT(*), (array_agg(id ORDER BY id))[1]
      INTO v_reg_count, v_reg_id
    FROM public.course_registrations
    WHERE invoice_id = p_invoice_id
      AND tenant_id = p_tenant_id
      AND deleted_at IS NULL
      AND status IS DISTINCT FROM 'cancelled';

    IF v_reg_count > 1 THEN
      RAISE EXCEPTION 'mark_invoice_paid_core_ambiguous_registration' USING ERRCODE = 'P0001';
    END IF;

    IF v_reg_count = 1 THEN
      IF p_sync_registration_id IS NOT NULL AND p_sync_registration_id IS DISTINCT FROM v_reg_id THEN
        RAISE EXCEPTION 'mark_invoice_paid_core_registration_mismatch' USING ERRCODE = 'P0001';
      END IF;

      UPDATE public.course_registrations
      SET
        payment_status = 'paid',
        amount_paid_rappen = v_clamped_total,
        updated_at = now()
      WHERE id = v_reg_id
        AND tenant_id = p_tenant_id
        AND invoice_id = p_invoice_id;
    ELSIF p_sync_registration_id IS NOT NULL THEN
      RAISE EXCEPTION 'mark_invoice_paid_core_registration_missing' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'outcome', 'settled',
    'invoice_id', p_invoice_id,
    'invoice_payment_id', v_payment_id,
    'bank_import_id', v_bank_id,
    'paid_amount_rappen', v_clamped_total,
    'new_payment_rappen', v_new_payment,
    'is_partial', v_is_partial,
    'settlement_source', p_settlement_source,
    'course_registration_id', v_reg_id,
    'actor_user_id', p_actor_user_id,
    'idempotent', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mark_invoice_paid_core(
  uuid, uuid, uuid, integer, integer, timestamptz, text, text, text, text, uuid,
  text, text, date, text, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_invoice_paid_core(
  uuid, uuid, uuid, integer, integer, timestamptz, text, text, text, text, uuid,
  text, text, date, text, text, text
) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_invoice_paid_core(
  uuid, uuid, uuid, integer, integer, timestamptz, text, text, text, text, uuid,
  text, text, date, text, text, text
) TO service_role;
