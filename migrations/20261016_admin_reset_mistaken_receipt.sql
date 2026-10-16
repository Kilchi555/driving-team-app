-- Draft only. Do not apply this file to production from the application deploy.
-- A person applies it after review. The function reverses one mistaken invoice
-- receipt inside a single transaction. It does not delete history.

CREATE TABLE IF NOT EXISTS public.payment_receipt_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  payment_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  reason text NOT NULL,
  previous_status text NOT NULL,
  new_status text NOT NULL,
  invoice_id uuid,
  settlement_id uuid,
  reversal_id uuid,
  accounting_entry_id uuid,
  storno_entry_id uuid,
  appointment_id uuid,
  appointment_status_before text,
  appointment_status_after text,
  idempotency_key text NOT NULL,
  result text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_receipt_resets_tenant_key UNIQUE (tenant_id, idempotency_key)
);

ALTER TABLE public.payment_receipt_resets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.payment_receipt_resets FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.payment_receipt_resets TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS invoice_payments_reversal_once
  ON public.invoice_payments (tenant_id, payment_reference)
  WHERE status = 'reversal' AND payment_reference IS NOT NULL;

CREATE OR REPLACE FUNCTION public.admin_reset_mistaken_receipt(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_payment_id uuid,
  p_reason text,
  p_idempotency_key text,
  p_confirm_siblings boolean,
  p_settlement_id uuid,
  p_expected_paid_after integer,
  p_appointment_status text,
  p_as_of date
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_income public.accounting_entries%ROWTYPE;
  v_existing public.payment_receipt_resets%ROWTYPE;
  v_sibling_count integer;
  v_next_paid integer;
  v_next_invoice_status text;
  v_next_payment_status text;
  v_past_due boolean;
  v_reversal_id uuid;
  v_storno_id uuid;
  v_income_id uuid;
  v_appointment_before text;
  v_result text;
BEGIN
  IF p_actor_user_id IS NULL OR p_tenant_id IS NULL OR p_payment_id IS NULL THEN
    RAISE EXCEPTION 'actor_tenant_and_payment_required';
  END IF;
  IF length(btrim(COALESCE(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION 'missing_reason';
  END IF;
  IF btrim(COALESCE(p_idempotency_key, '')) = '' THEN
    RAISE EXCEPTION 'missing_idempotency_key';
  END IF;

  SELECT * INTO v_existing
  FROM public.payment_receipt_resets
  WHERE tenant_id = p_tenant_id
    AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('result', v_existing.result, 'replayed', true, 'id', v_existing.id);
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;
  IF NOT FOUND OR v_payment.tenant_id IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'payment_not_found';
  END IF;

  IF v_payment.payment_method = 'cash'
     OR v_payment.wallee_transaction_id IS NOT NULL
     OR COALESCE(v_payment.refunded_amount_rappen, 0) > 0
     OR v_payment.payment_status = 'refunded' THEN
    RAISE EXCEPTION 'actual_receipt_channel';
  END IF;

  IF v_payment.appointment_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.cash_transactions
    WHERE appointment_id = v_payment.appointment_id
      AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'actual_receipt_channel';
  END IF;

  IF v_payment.invoice_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.bank_import_records
    WHERE invoice_id = v_payment.invoice_id
      AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'bank_settlement_present';
  END IF;

  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id = v_payment.invoice_id
    AND tenant_id = p_tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invoice_not_found';
  END IF;

  SELECT count(*) INTO v_sibling_count
  FROM public.payments
  WHERE invoice_id = v_invoice.id
    AND tenant_id = p_tenant_id
    AND id <> v_payment.id;
  IF v_sibling_count > 0 AND NOT COALESCE(p_confirm_siblings, false) THEN
    RAISE EXCEPTION 'missing_sibling_confirmation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.invoice_payments
    WHERE tenant_id = p_tenant_id
      AND invoice_id = v_invoice.id
      AND status = 'reversal'
      AND payment_reference = v_payment.id::text
  ) AND v_payment.payment_status IN ('invoice', 'pending') AND v_payment.paid_at IS NULL THEN
    INSERT INTO public.payment_receipt_resets (
      tenant_id, payment_id, actor_user_id, reason, previous_status, new_status,
      invoice_id, settlement_id, idempotency_key, result
    ) VALUES (
      p_tenant_id, v_payment.id, p_actor_user_id, btrim(p_reason),
      v_payment.payment_status, v_payment.payment_status,
      v_invoice.id, p_settlement_id, p_idempotency_key, 'already_applied'
    );
    RETURN jsonb_build_object('result', 'already_applied', 'replayed', false);
  END IF;

  IF v_payment.payment_status NOT IN ('completed', 'paid') THEN
    RAISE EXCEPTION 'status_not_resettable';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.invoice_payments
    WHERE id = p_settlement_id
      AND invoice_id = v_invoice.id
      AND tenant_id = p_tenant_id
      AND status = 'completed'
  ) THEN
    RAISE EXCEPTION 'missing_settlement';
  END IF;

  v_next_paid := v_invoice.paid_amount_rappen - v_payment.total_amount_rappen;
  IF v_next_paid IS DISTINCT FROM p_expected_paid_after OR v_next_paid < 0 THEN
    RAISE EXCEPTION 'paid_amount_conflict';
  END IF;

  v_past_due := v_invoice.due_date IS NOT NULL AND v_invoice.due_date < COALESCE(p_as_of, CURRENT_DATE);
  IF v_next_paid <= 0 THEN
    v_next_payment_status := CASE WHEN v_past_due THEN 'overdue' ELSE 'pending' END;
    v_next_invoice_status := CASE WHEN v_past_due THEN 'overdue' ELSE 'sent' END;
  ELSIF v_next_paid < v_invoice.total_amount_rappen THEN
    v_next_payment_status := 'partial';
    v_next_invoice_status := CASE WHEN v_past_due THEN 'overdue' ELSE 'sent' END;
  ELSE
    RAISE EXCEPTION 'paid_amount_conflict';
  END IF;

  UPDATE public.payments
  SET payment_status = 'invoice',
      paid_at = NULL,
      updated_at = now()
  WHERE id = p_payment_id
    AND tenant_id = p_tenant_id;

  UPDATE public.invoices
  SET paid_amount_rappen = v_next_paid,
      payment_status = v_next_payment_status,
      status = v_next_invoice_status,
      updated_at = now()
  WHERE id = v_invoice.id
    AND tenant_id = p_tenant_id;

  INSERT INTO public.invoice_payments (
    invoice_id, tenant_id, amount_rappen, payment_method, payment_reference,
    status, payment_date, notes, currency
  ) VALUES (
    v_invoice.id, p_tenant_id, v_payment.total_amount_rappen, 'reversal',
    v_payment.id::text, 'reversal', now(), btrim(p_reason), 'CHF'
  )
  RETURNING id INTO v_reversal_id;

  SELECT * INTO v_income
  FROM public.accounting_entries
  WHERE linked_payment_id = v_payment.id
    AND tenant_id = p_tenant_id
    AND deleted_at IS NULL
    AND storno_of_id IS NULL
  FOR UPDATE;

  IF FOUND THEN
    v_income_id := v_income.id;
    IF NOT EXISTS (
      SELECT 1 FROM public.accounting_entries
      WHERE storno_of_id = v_income.id
        AND deleted_at IS NULL
    ) THEN
      INSERT INTO public.accounting_entries (
        type, amount_rappen, entry_date, description, category_id,
        storno_of_id, tenant_id, approval_status, is_paid, paid_date
      ) VALUES (
        CASE WHEN v_income.type = 'expense' THEN 'income' ELSE 'expense' END,
        v_income.amount_rappen,
        CURRENT_DATE,
        left('Storno: ' || COALESCE(v_income.description, 'Zahlung'), 500),
        v_income.category_id,
        v_income.id,
        p_tenant_id,
        'approved',
        true,
        CURRENT_DATE
      )
      RETURNING id INTO v_storno_id;

      UPDATE public.accounting_entries
      SET locked_at = COALESCE(locked_at, now())
      WHERE id = v_income.id
        AND tenant_id = p_tenant_id;
    END IF;
  END IF;

  v_result := 'applied';
  IF p_appointment_status IS NOT NULL THEN
    IF p_appointment_status NOT IN ('confirmed', 'scheduled', 'completed', 'cancelled', 'pending', 'verrechnet') THEN
      RAISE EXCEPTION 'invalid_appointment_status';
    END IF;
    SELECT status INTO v_appointment_before
    FROM public.appointments
    WHERE id = v_payment.appointment_id
      AND tenant_id = p_tenant_id
    FOR UPDATE;
    UPDATE public.appointments
    SET status = p_appointment_status,
        updated_at = now()
    WHERE id = v_payment.appointment_id
      AND tenant_id = p_tenant_id;
  END IF;

  INSERT INTO public.payment_receipt_resets (
    tenant_id, payment_id, actor_user_id, reason, previous_status, new_status,
    invoice_id, settlement_id, reversal_id, accounting_entry_id, storno_entry_id,
    appointment_id, appointment_status_before, appointment_status_after,
    idempotency_key, result
  ) VALUES (
    p_tenant_id, v_payment.id, p_actor_user_id, btrim(p_reason),
    v_payment.payment_status, 'invoice',
    v_invoice.id, p_settlement_id, v_reversal_id, v_income_id, v_storno_id,
    v_payment.appointment_id, v_appointment_before,
    CASE WHEN p_appointment_status IS NULL THEN v_appointment_before ELSE p_appointment_status END,
    p_idempotency_key, v_result
  );

  RETURN jsonb_build_object(
    'result', v_result,
    'payment_id', v_payment.id,
    'invoice_id', v_invoice.id,
    'paid_amount_rappen', v_next_paid,
    'reversal_id', v_reversal_id,
    'storno_entry_id', v_storno_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reset_mistaken_receipt(
  uuid, uuid, uuid, text, text, boolean, uuid, integer, text, date
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_mistaken_receipt(
  uuid, uuid, uuid, text, text, boolean, uuid, integer, text, date
) TO service_role;
