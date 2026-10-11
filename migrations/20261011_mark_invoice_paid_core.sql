-- Atomic core for mark-invoice-paid: invoice row + invoice_payments + optional
-- course_registrations sync. Does NOT write cash_transactions and does NOT
-- invent provider settlements. Staff-POS credits remain in the application layer.
--
-- NOT applied to production by this PR; apply only via approved migration rollout.

CREATE OR REPLACE FUNCTION public.mark_invoice_paid_core(
  p_tenant_id uuid,
  p_invoice_id uuid,
  p_actor_user_id uuid,
  p_expected_paid_amount_rappen integer,
  p_new_payment_rappen integer,
  p_clamped_total_rappen integer,
  p_is_partial boolean,
  p_paid_at timestamptz,
  p_payment_method text,
  p_notes text,
  p_internal_notes text,
  p_settlement_source text,
  p_sync_registration_id uuid DEFAULT NULL,
  p_sync_amount_paid_rappen integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_payment_id uuid;
  v_reg_count integer;
  v_reg_id uuid;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'mark_invoice_paid_core_service_role_only' USING ERRCODE = '42501';
  END IF;

  IF p_tenant_id IS NULL OR p_invoice_id IS NULL OR p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'mark_invoice_paid_core_missing_args' USING ERRCODE = '22023';
  END IF;

  IF p_new_payment_rappen IS NULL OR p_new_payment_rappen <= 0 THEN
    RAISE EXCEPTION 'mark_invoice_paid_core_invalid_amount' USING ERRCODE = '22023';
  END IF;

  IF p_settlement_source IS NULL OR p_settlement_source NOT IN ('bank_import', 'manual_attestation') THEN
    RAISE EXCEPTION 'mark_invoice_paid_core_invalid_settlement_source' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id = p_invoice_id
    AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'mark_invoice_paid_core_invoice_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF coalesce(v_invoice.paid_amount_rappen, 0) <> coalesce(p_expected_paid_amount_rappen, 0) THEN
    RAISE EXCEPTION 'mark_invoice_paid_core_concurrent_modification' USING ERRCODE = '40001';
  END IF;

  IF coalesce(v_invoice.paid_amount_rappen, 0) >= coalesce(v_invoice.total_amount_rappen, 0)
     AND coalesce(v_invoice.total_amount_rappen, 0) > 0 THEN
    RAISE EXCEPTION 'mark_invoice_paid_core_already_paid' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.invoices
  SET
    payment_status = CASE WHEN p_is_partial THEN 'partial' ELSE 'paid' END,
    status = CASE WHEN p_is_partial THEN 'sent' ELSE 'paid' END,
    paid_at = p_paid_at,
    paid_amount_rappen = p_clamped_total_rappen,
    internal_notes = COALESCE(p_internal_notes, internal_notes),
    dunning_level = CASE WHEN NOT p_is_partial THEN 0 ELSE dunning_level END,
    dunning_paused = CASE WHEN NOT p_is_partial THEN false ELSE dunning_paused END,
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
    p_new_payment_rappen,
    p_paid_at,
    p_payment_method,
    p_notes,
    'completed',
    'CHF'
  )
  RETURNING id INTO v_payment_id;

  IF NOT p_is_partial THEN
    SELECT COUNT(*), MIN(id)
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
        amount_paid_rappen = COALESCE(p_sync_amount_paid_rappen, p_clamped_total_rappen),
        updated_at = now()
      WHERE id = v_reg_id
        AND tenant_id = p_tenant_id
        AND invoice_id = p_invoice_id;
    ELSIF p_sync_registration_id IS NOT NULL THEN
      RAISE EXCEPTION 'mark_invoice_paid_core_registration_missing' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'invoice_id', p_invoice_id,
    'invoice_payment_id', v_payment_id,
    'paid_amount_rappen', p_clamped_total_rappen,
    'is_partial', p_is_partial,
    'settlement_source', p_settlement_source,
    'course_registration_id', v_reg_id,
    'actor_user_id', p_actor_user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mark_invoice_paid_core(
  uuid, uuid, uuid, integer, integer, integer, boolean, timestamptz, text, text, text, text, uuid, integer
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_invoice_paid_core(
  uuid, uuid, uuid, integer, integer, integer, boolean, timestamptz, text, text, text, text, uuid, integer
) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_invoice_paid_core(
  uuid, uuid, uuid, integer, integer, integer, boolean, timestamptz, text, text, text, text, uuid, integer
) TO service_role;
