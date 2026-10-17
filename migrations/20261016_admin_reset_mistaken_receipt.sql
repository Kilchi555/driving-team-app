-- Draft only. Do not apply this file to production from the application deploy.
-- A person applies it after review, on a database they choose. The function
-- reverses one mistaken invoice receipt inside a single transaction.
-- It does not delete the original payment, settlement, or income entry.
--
-- Canonical paid amount:
--   invoices.paid_amount_rappen
--     = SUM(payments.total_amount_rappen)
--       for the same invoice and tenant
--       where payment_status is still completed or paid.
-- History display net:
--   SUM(invoice_payments.amount_rappen) for status completed
--   minus SUM(invoice_payments.amount_rappen) for status reversal.
-- A reversal row stays positive because check_positive_amount requires it.
-- It is not a completed receipt.
--
-- Accounting, one effect:
--   get_payments_monthly_summary is not in this repository. Its text on
--   non-production and production, read on 2026-10-16, sums payments with
--   payment_status = 'completed'. Moving this payment to 'invoice' removes it from
--   payment income once. The original linked income entry stays, and
--   computeSimpleBookIncome ignores income that has linked_payment_id.
--   The function also inserts one expense storno with
--   external_reference = 'payment-receipt-reset' and reversing journal
--   lines when the original entry already has journal lines. Profit and
--   loss excludes that marked storno. VAT already skips storno rows and
--   the reversed original. A manual storno has no marker and still counts.
--
-- Recovery after an applied correction (dropping the function is not a rollback):
--   1. Read payment_receipt_resets for the payment where result = 'applied'.
--      It has actor, reason, payment_id, reversal_id, accounting_entry_id,
--      storno_entry_id, paid_amount_before, and paid_amount_after.
--   2. Leave the original payment, the original completed settlement, the
--      reversal row, the original income entry, and the storno in place.
--   3. If a person decides the receipt was valid after all, record a new
--      completed invoice_payments row for the same amount, set this payment
--      back to completed with the previous paid_at, and set
--      invoices.paid_amount_rappen to the sum of payments that are again
--      completed or paid. Set invoice status and payment_status to paid
--      and restore paid_at only when that sum covers the invoice total.
--      History net is then completed minus reversal plus the new completed
--      row. Do not delete the reversal.
--   4. The marked storno stays out of profit and loss. Restoring the
--      payment to completed puts the amount back into payment income once.
--      If journal lines were reversed, post a new reversing pair on the
--      storno lines so the ledger matches the restored receipt. Do that
--      as a reviewed accounting entry, not by editing locked rows.
--
-- Credits, fail closed. This function does not insert, update, or delete
-- credit_transactions, student_credits, or invoices.credit_applied_rappen.
-- It does not reverse a wallet or Staff-POS credit. Before the
-- already_applied audit insert and before any payment, invoice, settlement,
-- or accounting write it rejects the reset when:
--   invoices.credit_applied_rappen > 0
--     -> wallet_credit_present
--   credit_transactions.reference_type = 'invoice'
--     and reference_id = this invoice
--     and transaction_type in ('deposit', 'credit_product_purchase')
--     and tenant_id is this tenant or null
--     -> invoice_credit_transaction_present
--   credit_transactions.reference_type = 'payment'
--     and transaction_type = 'credit_product_purchase'
--     and reference_id is any payment on this invoice and tenant
--     and tenant_id is this tenant or null
--     -> staff_pos_credit_present
--   payments.credit_transaction_id is not null on the target payment
--     -> linked_credit_transaction_present
-- credit_transactions.status is an unconstrained varchar. Comments on the
-- shared test project name pending, completed, failed, cancelled,
-- withdrawal_pending, and withdrawal_completed. None of those values is a
-- reversed flag in the database, so any matching row still blocks.
-- student_credits.balance_rappen is not scanned: a balance is not tied to
-- one invoice. If that balance was changed without one of the facts above,
-- this reset cannot see it and does not try a partial reversal.
-- A same-key replay returns the stored payload and does not re-check credit.
-- A new key does not report already_applied while one of the facts above
-- is still present.
--
-- Idempotency: a stored result is reused only when tenant_id and payment_id
-- both match. The same key for a different payment raises
-- idempotency_payment_mismatch and writes nothing.
--
-- Already applied: an existing reversal for this payment is recognized
-- after the row locks and before sibling confirmation or disposition
-- checks. A repeated request does not need new dispositions. It records
-- one audit row with result already_applied and does not insert another
-- reversal or storno.

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
  paid_amount_before integer,
  paid_amount_after integer,
  confirm_siblings boolean,
  invoice_line_disposition text,
  appointment_disposition text,
  result_payload jsonb,
  CONSTRAINT payment_receipt_resets_tenant_key UNIQUE (tenant_id, idempotency_key)
);

ALTER TABLE public.payment_receipt_resets
  ADD COLUMN IF NOT EXISTS paid_amount_before integer,
  ADD COLUMN IF NOT EXISTS paid_amount_after integer,
  ADD COLUMN IF NOT EXISTS confirm_siblings boolean,
  ADD COLUMN IF NOT EXISTS invoice_line_disposition text,
  ADD COLUMN IF NOT EXISTS appointment_disposition text,
  ADD COLUMN IF NOT EXISTS result_payload jsonb;

ALTER TABLE public.payment_receipt_resets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.payment_receipt_resets FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.payment_receipt_resets TO service_role;

ALTER TABLE public.invoice_payments DROP CONSTRAINT IF EXISTS check_payment_status;
ALTER TABLE public.invoice_payments
  ADD CONSTRAINT check_payment_status
  CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'reversal'));

COMMENT ON CONSTRAINT check_payment_status ON public.invoice_payments IS
  'reversal is a positive-amount correction of a mistaken receipt. Net history = completed minus reversal. It is not another successful payment.';

CREATE UNIQUE INDEX IF NOT EXISTS invoice_payments_reversal_once
  ON public.invoice_payments (tenant_id, payment_reference)
  WHERE status = 'reversal' AND payment_reference IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS accounting_entries_one_live_storno
  ON public.accounting_entries (storno_of_id)
  WHERE storno_of_id IS NOT NULL AND deleted_at IS NULL;

DROP FUNCTION IF EXISTS public.admin_reset_mistaken_receipt(
  uuid, uuid, uuid, text, text, boolean, uuid, integer, text, date
);
DROP FUNCTION IF EXISTS public.admin_reset_mistaken_receipt(
  uuid, uuid, uuid, text, text, boolean, uuid, integer, text, date, text, text
);

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
  p_as_of date,
  p_invoice_line_disposition text,
  p_appointment_disposition text
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
  v_paid_before integer;
  v_next_invoice_status text;
  v_next_payment_status text;
  v_past_due boolean;
  v_reversal_id uuid;
  v_storno_id uuid;
  v_income_id uuid;
  v_income_count integer;
  v_line_count integer;
  v_line_amount integer;
  v_settlement_count integer;
  v_appointment_before text;
  v_appointment_after text;
  v_result text;
  v_payload jsonb;
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
  IF NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = p_actor_user_id
      AND tenant_id = p_tenant_id
      AND role IN ('admin', 'tenant_admin')
      AND is_active IS TRUE
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_tenant_id::text), hashtext(btrim(p_idempotency_key)));

  SELECT * INTO v_existing
  FROM public.payment_receipt_resets
  WHERE tenant_id = p_tenant_id
    AND idempotency_key = btrim(p_idempotency_key);
  IF FOUND THEN
    IF v_existing.payment_id IS DISTINCT FROM p_payment_id THEN
      RAISE EXCEPTION 'idempotency_payment_mismatch';
    END IF;
    RETURN COALESCE(v_existing.result_payload, jsonb_build_object('result', v_existing.result))
      || jsonb_build_object('replayed', true, 'id', v_existing.id);
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
    AND tenant_id = p_tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_not_found';
  END IF;

  IF v_payment.payment_method = 'cash'
     OR v_payment.wallee_transaction_id IS NOT NULL
     OR COALESCE(v_payment.refunded_amount_rappen, 0) > 0
     OR v_payment.payment_status = 'refunded' THEN
    RAISE EXCEPTION 'actual_receipt_channel';
  END IF;

  IF v_payment.appointment_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.cash_transactions
    WHERE appointment_id = v_payment.appointment_id
  ) THEN
    RAISE EXCEPTION 'actual_receipt_channel';
  END IF;

  IF v_payment.invoice_id IS NULL THEN
    RAISE EXCEPTION 'invoice_not_found';
  END IF;

  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id = v_payment.invoice_id
    AND tenant_id = p_tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invoice_not_found';
  END IF;
  v_paid_before := v_invoice.paid_amount_rappen;

  IF EXISTS (
    SELECT 1
    FROM public.bank_import_records
    WHERE invoice_id = v_invoice.id
      AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'bank_settlement_present';
  END IF;

  PERFORM 1
  FROM public.payments
  WHERE invoice_id = v_invoice.id
    AND tenant_id = p_tenant_id
    AND id <> v_payment.id
  ORDER BY id
  FOR UPDATE;

  SELECT id INTO v_reversal_id
  FROM public.invoice_payments
  WHERE tenant_id = p_tenant_id
    AND invoice_id = v_invoice.id
    AND status = 'reversal'
    AND payment_reference = v_payment.id::text
  FOR UPDATE;

  -- Fail closed before already_applied and before any financial write.
  -- status is not a liveness flag, so a cancelled or failed row still matches.
  IF COALESCE(v_invoice.credit_applied_rappen, 0) > 0 THEN
    RAISE EXCEPTION 'wallet_credit_present';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.credit_transactions ct
    WHERE ct.reference_type = 'invoice'
      AND ct.reference_id = v_invoice.id
      AND ct.transaction_type IN ('deposit', 'credit_product_purchase')
      AND (ct.tenant_id = p_tenant_id OR ct.tenant_id IS NULL)
  ) THEN
    RAISE EXCEPTION 'invoice_credit_transaction_present';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.credit_transactions ct
    WHERE ct.reference_type = 'payment'
      AND ct.transaction_type = 'credit_product_purchase'
      AND ct.reference_id IN (
        SELECT p.id
        FROM public.payments p
        WHERE p.invoice_id = v_invoice.id
          AND p.tenant_id = p_tenant_id
      )
      AND (ct.tenant_id = p_tenant_id OR ct.tenant_id IS NULL)
  ) THEN
    RAISE EXCEPTION 'staff_pos_credit_present';
  END IF;

  IF v_payment.credit_transaction_id IS NOT NULL THEN
    RAISE EXCEPTION 'linked_credit_transaction_present';
  END IF;

  IF v_reversal_id IS NOT NULL THEN
    IF v_payment.payment_status IN ('completed', 'paid') OR v_payment.paid_at IS NOT NULL THEN
      RAISE EXCEPTION 'reversal_conflict'
        USING DETAIL = v_reversal_id::text;
    END IF;

    SELECT e.id INTO v_income_id
    FROM public.accounting_entries e
    WHERE e.linked_payment_id = v_payment.id
      AND e.tenant_id = p_tenant_id
      AND e.deleted_at IS NULL
      AND e.storno_of_id IS NULL
    ORDER BY e.id
    LIMIT 1;
    SELECT s.id INTO v_storno_id
    FROM public.accounting_entries s
    WHERE s.storno_of_id = v_income_id
      AND s.tenant_id = p_tenant_id
      AND s.deleted_at IS NULL
    ORDER BY s.id
    LIMIT 1;
    IF v_storno_id IS NULL AND EXISTS (
      SELECT 1
      FROM public.accounting_entries s
      WHERE s.storno_of_id = v_income_id
        AND s.deleted_at IS NULL
        AND s.tenant_id IS DISTINCT FROM p_tenant_id
    ) THEN
      RAISE EXCEPTION 'storno_conflict';
    END IF;

    v_payload := jsonb_build_object(
      'result', 'already_applied',
      'replayed', false,
      'payment_id', v_payment.id,
      'invoice_id', v_invoice.id,
      'paid_amount_before_rappen', v_paid_before,
      'paid_amount_after_rappen', v_paid_before,
      'reversal_id', v_reversal_id,
      'accounting_entry_id', v_income_id,
      'storno_entry_id', v_storno_id
    );
    INSERT INTO public.payment_receipt_resets (
      tenant_id, payment_id, actor_user_id, reason, previous_status, new_status,
      invoice_id, settlement_id, reversal_id, accounting_entry_id, storno_entry_id,
      appointment_id, idempotency_key, result,
      paid_amount_before, paid_amount_after, confirm_siblings,
      invoice_line_disposition, appointment_disposition, result_payload
    ) VALUES (
      p_tenant_id, v_payment.id, p_actor_user_id, btrim(p_reason),
      v_payment.payment_status, v_payment.payment_status,
      v_invoice.id, p_settlement_id, v_reversal_id, v_income_id, v_storno_id,
      v_payment.appointment_id, btrim(p_idempotency_key), 'already_applied',
      v_paid_before, v_paid_before, COALESCE(p_confirm_siblings, false),
      p_invoice_line_disposition, p_appointment_disposition, v_payload
    );
    RETURN v_payload;
  END IF;

  IF v_payment.payment_status NOT IN ('completed', 'paid') THEN
    RAISE EXCEPTION 'status_not_resettable';
  END IF;

  SELECT count(*) INTO v_sibling_count
  FROM public.payments
  WHERE invoice_id = v_invoice.id
    AND tenant_id = p_tenant_id
    AND id <> v_payment.id;
  IF v_sibling_count > 0 AND NOT COALESCE(p_confirm_siblings, false) THEN
    RAISE EXCEPTION 'missing_sibling_confirmation';
  END IF;

  IF v_payment.appointment_id IS NOT NULL THEN
    SELECT count(*)::integer, COALESCE(min(total_price_rappen), 0)
    INTO v_line_count, v_line_amount
    FROM public.invoice_items
    WHERE invoice_id = v_invoice.id
      AND tenant_id = p_tenant_id
      AND appointment_id = v_payment.appointment_id;
    IF v_line_count <> 1 OR v_line_amount IS DISTINCT FROM v_payment.total_amount_rappen THEN
      RAISE EXCEPTION 'amount_line_mismatch';
    END IF;
  END IF;

  IF p_invoice_line_disposition IS DISTINCT FROM 'remain_on_invoice' THEN
    IF p_invoice_line_disposition = 'detach' THEN
      RAISE EXCEPTION 'invoice_line_detach_not_supported';
    END IF;
    RAISE EXCEPTION 'missing_invoice_line_disposition';
  END IF;

  IF v_payment.appointment_id IS NOT NULL THEN
    IF p_appointment_disposition = 'set_status' THEN
      IF p_appointment_status IS NULL
         OR p_appointment_status NOT IN ('confirmed', 'scheduled', 'completed', 'cancelled', 'pending', 'verrechnet') THEN
        RAISE EXCEPTION 'invalid_appointment_status';
      END IF;
    ELSIF p_appointment_disposition IS DISTINCT FROM 'leave_unchanged' THEN
      RAISE EXCEPTION 'missing_appointment_disposition';
    END IF;
  END IF;

  SELECT count(*) INTO v_settlement_count
  FROM public.invoice_payments
  WHERE invoice_id = v_invoice.id
    AND tenant_id = p_tenant_id
    AND status = 'completed';
  IF v_settlement_count = 0 THEN
    RAISE EXCEPTION 'missing_settlement';
  END IF;
  IF v_settlement_count <> 1 THEN
    RAISE EXCEPTION 'ambiguous_settlements';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.invoice_payments
    WHERE id = p_settlement_id
      AND invoice_id = v_invoice.id
      AND tenant_id = p_tenant_id
      AND status = 'completed'
  ) THEN
    RAISE EXCEPTION 'missing_settlement';
  END IF;

  SELECT COALESCE(sum(total_amount_rappen), 0) INTO v_next_paid
  FROM public.payments
  WHERE invoice_id = v_invoice.id
    AND tenant_id = p_tenant_id
    AND id <> v_payment.id
    AND payment_status IN ('completed', 'paid');
  IF v_next_paid IS DISTINCT FROM p_expected_paid_after OR v_next_paid < 0 OR v_next_paid > v_invoice.total_amount_rappen THEN
    RAISE EXCEPTION 'paid_amount_conflict';
  END IF;

  SELECT count(*) INTO v_income_count
  FROM public.accounting_entries
  WHERE linked_payment_id = v_payment.id
    AND tenant_id = p_tenant_id
    AND deleted_at IS NULL
    AND storno_of_id IS NULL;
  IF v_income_count > 1 THEN
    RAISE EXCEPTION 'ambiguous_accounting';
  END IF;

  SELECT * INTO v_income
  FROM public.accounting_entries
  WHERE linked_payment_id = v_payment.id
    AND tenant_id = p_tenant_id
    AND deleted_at IS NULL
    AND storno_of_id IS NULL
  FOR UPDATE;
  IF FOUND THEN
    v_income_id := v_income.id;
    IF v_income.amount_rappen IS DISTINCT FROM v_payment.total_amount_rappen THEN
      RAISE EXCEPTION 'accounting_amount_mismatch';
    END IF;
  END IF;

  -- Same clock as update_invoice_status. A caller date must not choose 'sent'
  -- when CURRENT_DATE is already past due, or the BEFORE trigger rewrites
  -- payment_status from partial to overdue.
  v_past_due := v_invoice.due_date IS NOT NULL AND v_invoice.due_date < CURRENT_DATE;
  IF v_next_paid <= 0 THEN
    v_next_payment_status := CASE WHEN v_past_due THEN 'overdue' ELSE 'pending' END;
    v_next_invoice_status := CASE WHEN v_past_due THEN 'overdue' ELSE 'sent' END;
  ELSIF v_next_paid < v_invoice.total_amount_rappen THEN
    v_next_payment_status := 'partial';
    v_next_invoice_status := CASE WHEN v_past_due THEN 'overdue' ELSE 'sent' END;
  ELSE
    v_next_payment_status := 'paid';
    v_next_invoice_status := 'paid';
  END IF;

  UPDATE public.payments
  SET payment_status = 'invoice',
      paid_at = NULL,
      updated_at = now()
  WHERE id = v_payment.id
    AND tenant_id = p_tenant_id;

  UPDATE public.invoices
  SET paid_amount_rappen = v_next_paid,
      payment_status = v_next_payment_status,
      status = v_next_invoice_status,
      paid_at = CASE WHEN v_next_paid >= total_amount_rappen THEN paid_at ELSE NULL END,
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

  IF v_income_id IS NOT NULL THEN
    SELECT id INTO v_storno_id
    FROM public.accounting_entries
    WHERE storno_of_id = v_income_id
      AND tenant_id = p_tenant_id
      AND deleted_at IS NULL
    FOR UPDATE;

    IF v_storno_id IS NULL THEN
      BEGIN
        INSERT INTO public.accounting_entries (
          type, amount_rappen, entry_date, description, category_id,
          storno_of_id, tenant_id, approval_status, is_paid, paid_date,
          source, external_reference, document_kind
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
          CURRENT_DATE,
          'system',
          'payment-receipt-reset',
          v_income.document_kind
        )
        RETURNING id INTO v_storno_id;
      EXCEPTION
        WHEN unique_violation THEN
          SELECT id INTO v_storno_id
          FROM public.accounting_entries
          WHERE storno_of_id = v_income_id
            AND tenant_id = p_tenant_id
            AND deleted_at IS NULL
          ORDER BY id
          LIMIT 1;
      END;
    END IF;

    IF v_storno_id IS NULL THEN
      RAISE EXCEPTION 'storno_conflict';
    END IF;

    UPDATE public.accounting_entries
    SET external_reference = 'payment-receipt-reset'
    WHERE id = v_storno_id
      AND tenant_id = p_tenant_id
      AND (external_reference IS NULL OR external_reference = 'payment-receipt-reset');

    IF NOT EXISTS (
      SELECT 1
      FROM public.accounting_journal_lines
      WHERE entry_id = v_storno_id
        AND tenant_id = p_tenant_id
    ) THEN
      INSERT INTO public.accounting_journal_lines (
        tenant_id, entry_id, account_id, debit_rappen, credit_rappen
      )
      SELECT p_tenant_id, v_storno_id, account_id, credit_rappen, debit_rappen
      FROM public.accounting_journal_lines
      WHERE entry_id = v_income_id
        AND tenant_id = p_tenant_id;
    END IF;

    UPDATE public.accounting_entries
    SET locked_at = COALESCE(locked_at, now())
    WHERE id = v_income_id
      AND tenant_id = p_tenant_id;
  END IF;

  v_appointment_after := NULL;
  IF v_payment.appointment_id IS NOT NULL THEN
    SELECT status INTO v_appointment_before
    FROM public.appointments
    WHERE id = v_payment.appointment_id
      AND tenant_id = p_tenant_id
    FOR UPDATE;
    v_appointment_after := v_appointment_before;
    IF p_appointment_disposition = 'set_status' THEN
      UPDATE public.appointments
      SET status = p_appointment_status,
          updated_at = now()
      WHERE id = v_payment.appointment_id
        AND tenant_id = p_tenant_id;
      v_appointment_after := p_appointment_status;
    END IF;
  END IF;

  v_result := 'applied';
  v_payload := jsonb_build_object(
    'result', v_result,
    'replayed', false,
    'payment_id', v_payment.id,
    'invoice_id', v_invoice.id,
    'paid_amount_before_rappen', v_paid_before,
    'paid_amount_after_rappen', v_next_paid,
    'reversal_id', v_reversal_id,
    'accounting_entry_id', v_income_id,
    'storno_entry_id', v_storno_id,
    'status_clock', CURRENT_DATE,
    'as_of', p_as_of
  );

  INSERT INTO public.payment_receipt_resets (
    tenant_id, payment_id, actor_user_id, reason, previous_status, new_status,
    invoice_id, settlement_id, reversal_id, accounting_entry_id, storno_entry_id,
    appointment_id, appointment_status_before, appointment_status_after,
    idempotency_key, result,
    paid_amount_before, paid_amount_after, confirm_siblings,
    invoice_line_disposition, appointment_disposition, result_payload
  ) VALUES (
    p_tenant_id, v_payment.id, p_actor_user_id, btrim(p_reason),
    v_payment.payment_status, 'invoice',
    v_invoice.id, p_settlement_id, v_reversal_id, v_income_id, v_storno_id,
    v_payment.appointment_id, v_appointment_before, v_appointment_after,
    btrim(p_idempotency_key), v_result,
    v_paid_before, v_next_paid, COALESCE(p_confirm_siblings, false),
    p_invoice_line_disposition, p_appointment_disposition, v_payload
  );

  RETURN v_payload;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reset_mistaken_receipt(
  uuid, uuid, uuid, text, text, boolean, uuid, integer, text, date, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_mistaken_receipt(
  uuid, uuid, uuid, text, text, boolean, uuid, integer, text, date, text, text
) TO service_role;
