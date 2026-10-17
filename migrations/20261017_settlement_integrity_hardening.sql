-- Settlement integrity hardening — 2026-10-17
-- Additive only. Do not apply to production or shared staging from this PR.
-- Does not update, delete, or reassign existing invoices, payments, or wallet rows.
-- Depends on migrations/20261016_payment_settlement_atomicity.sql.
--
-- Not in this file: an unapplied-payment or liability account for an invoice
-- surplus. The repository has no such store. The header cap stays in the
-- existing settlement function. A surplus is not credited to student_credits
-- by that function.
--
-- Manual retries use an optional invoice_payments.idempotency_key. A missing
-- key still books, so two equal installments remain possible.
-- Wallet ledger and balance for a flagged invoice line commit in one function.
-- A bulk cash surplus with an action key commits in one function and replays
-- that key. A surplus without a key is unchanged.

BEGIN;

ALTER TABLE public.invoice_payments
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS invoice_payments_idempotency_key_uidx
  ON public.invoice_payments (tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN public.invoice_payments.idempotency_key IS
  'Optional caller action id. Null keys are not duplicates. Not an invoice-plus-amount key.';

DO $$
DECLARE
  v_duplicates integer;
BEGIN
  SELECT count(*) INTO v_duplicates
  FROM (
    SELECT tenant_id, reference_id
    FROM public.credit_transactions
    WHERE transaction_type = 'deposit'
      AND reference_type = 'invoice'
      AND reference_id IS NOT NULL
    GROUP BY tenant_id, reference_id
    HAVING count(*) > 1
  ) duplicates;

  IF v_duplicates > 0 THEN
    RAISE EXCEPTION 'invoice_deposit_duplicates_exist';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_invoice_deposit_uidx
  ON public.credit_transactions (tenant_id, reference_id)
  WHERE transaction_type = 'deposit'
    AND reference_type = 'invoice'
    AND reference_id IS NOT NULL;

DO $$
DECLARE
  v_duplicates integer;
BEGIN
  SELECT count(*) INTO v_duplicates
  FROM (
    SELECT tenant_id, description
    FROM public.credit_transactions
    WHERE transaction_type = 'deposit'
      AND payment_method = 'cash'
      AND reference_type = 'overpayment'
      AND description LIKE 'bulk-cash-overpay:%'
    GROUP BY tenant_id, description
    HAVING count(*) > 1
  ) duplicates;

  IF v_duplicates > 0 THEN
    RAISE EXCEPTION 'bulk_cash_overpay_duplicates_exist';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_bulk_cash_overpay_uidx
  ON public.credit_transactions (tenant_id, description)
  WHERE transaction_type = 'deposit'
    AND payment_method = 'cash'
    AND reference_type = 'overpayment'
    AND description LIKE 'bulk-cash-overpay:%';

CREATE OR REPLACE FUNCTION public.settle_marked_invoice_payment_idempotent(
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
  p_import_source text,
  p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $fn$
DECLARE
  v_actor public.users%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_requested integer;
  v_key text := NULLIF(btrim(COALESCE(p_idempotency_key, '')), '');
  v_existing_amount integer;
  v_result jsonb;
  v_constraint text;
  v_message text;
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

  IF v_key IS NOT NULL AND v_key !~ '^[A-Za-z0-9_-]{8,80}$' THEN
    RAISE EXCEPTION 'invalid_idempotency_key' USING ERRCODE = '22023';
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

  IF p_paid_amount_rappen IS NULL OR p_paid_amount_rappen = 0 THEN
    v_requested := v_invoice.total_amount_rappen;
  ELSE
    v_requested := p_paid_amount_rappen;
  END IF;

  IF v_key IS NOT NULL THEN
    SELECT amount_rappen INTO v_existing_amount
    FROM public.invoice_payments
    WHERE tenant_id = v_actor.tenant_id
      AND idempotency_key = v_key;

    IF FOUND THEN
      IF v_existing_amount IS DISTINCT FROM v_requested THEN
        RAISE EXCEPTION 'idempotency_amount_mismatch' USING ERRCODE = '23514';
      END IF;
      RETURN jsonb_build_object(
        'ok', true,
        'replayed', true,
        'invoice_id', p_invoice_id,
        'paid_amount_rappen', COALESCE(v_invoice.paid_amount_rappen, 0),
        'is_partial', v_invoice.payment_status IS DISTINCT FROM 'paid'
      );
    END IF;
  END IF;

  BEGIN
    v_result := public.settle_marked_invoice_payment(
      p_actor_user_id,
      p_invoice_id,
      p_paid_amount_rappen,
      p_paid_at,
      p_note,
      p_payment_method,
      p_camt_dedupe_key,
      p_camt_bank_ref,
      p_camt_entry_date,
      p_camt_reference,
      p_camt_debtor_name,
      p_import_source
    );

    IF v_key IS NOT NULL AND COALESCE(v_result->>'replayed', 'false') <> 'true' THEN
      UPDATE public.invoice_payments
      SET idempotency_key = v_key
      WHERE id = (
        SELECT id
        FROM public.invoice_payments
        WHERE invoice_id = p_invoice_id
          AND tenant_id = v_actor.tenant_id
          AND idempotency_key IS NULL
          AND amount_rappen = v_requested
        ORDER BY created_at DESC NULLS LAST, id DESC
        LIMIT 1
      );

      IF NOT FOUND THEN
        RAISE EXCEPTION 'idempotency_stamp_failed' USING ERRCODE = 'P0002';
      END IF;
    END IF;

    RETURN v_result;
  EXCEPTION
    WHEN unique_violation THEN
      GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME, v_message = MESSAGE_TEXT;
      IF v_message LIKE '%duplicate_bank_import%'
        OR v_constraint IS DISTINCT FROM 'invoice_payments_idempotency_key_uidx'
      THEN
        RAISE;
      END IF;

      SELECT amount_rappen INTO v_existing_amount
      FROM public.invoice_payments
      WHERE tenant_id = v_actor.tenant_id
        AND idempotency_key = v_key;

      IF v_existing_amount IS NULL THEN
        RAISE EXCEPTION 'idempotency_conflict' USING ERRCODE = '23505';
      END IF;
      IF v_existing_amount IS DISTINCT FROM v_requested THEN
        RAISE EXCEPTION 'idempotency_amount_mismatch' USING ERRCODE = '23514';
      END IF;

      SELECT * INTO v_invoice
      FROM public.invoices
      WHERE id = p_invoice_id
        AND tenant_id = v_actor.tenant_id;

      RETURN jsonb_build_object(
        'ok', true,
        'replayed', true,
        'invoice_id', p_invoice_id,
        'paid_amount_rappen', COALESCE(v_invoice.paid_amount_rappen, 0),
        'is_partial', v_invoice.payment_status IS DISTINCT FROM 'paid'
      );
  END;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.apply_invoice_product_credit(
  p_actor_user_id uuid,
  p_tenant_id uuid,
  p_user_id uuid,
  p_invoice_id uuid,
  p_amount integer,
  p_note text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $fn$
DECLARE
  v_tx_id uuid;
  v_existing_amount integer;
  v_existing_user uuid;
  v_balance integer;
  v_constraint text;
BEGIN
  IF p_tenant_id IS NULL OR p_user_id IS NULL OR p_invoice_id IS NULL THEN
    RAISE EXCEPTION 'invalid_identity' USING ERRCODE = '22023';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = p_user_id
      AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'user_not_in_tenant' USING ERRCODE = '42501';
  END IF;
  IF p_actor_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = p_actor_user_id
      AND tenant_id = p_tenant_id
      AND role IN ('admin', 'tenant_admin', 'staff')
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.invoices
    WHERE id = p_invoice_id
      AND tenant_id = p_tenant_id
      AND user_id = p_user_id
      AND payment_status = 'paid'
  ) THEN
    RAISE EXCEPTION 'invoice_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT ct.id, ct.amount_rappen, ct.user_id
    INTO v_tx_id, v_existing_amount, v_existing_user
  FROM public.credit_transactions ct
  WHERE ct.tenant_id = p_tenant_id
    AND ct.reference_id = p_invoice_id
    AND ct.transaction_type = 'deposit'
    AND ct.reference_type = 'invoice'
  LIMIT 1;

  IF v_tx_id IS NOT NULL THEN
    IF v_existing_user IS DISTINCT FROM p_user_id OR v_existing_amount IS DISTINCT FROM p_amount THEN
      RAISE EXCEPTION 'idempotency_amount_mismatch' USING ERRCODE = '23514';
    END IF;
    RETURN jsonb_build_object(
      'ok', true,
      'applied', false,
      'already_applied', true,
      'amount_rappen', v_existing_amount
    );
  END IF;

  BEGIN
    INSERT INTO public.credit_transactions (
      user_id, tenant_id, transaction_type, amount_rappen,
      balance_before_rappen, balance_after_rappen, payment_method,
      reference_id, reference_type, notes, created_by, status
    ) VALUES (
      p_user_id, p_tenant_id, 'deposit', p_amount,
      0, 0, 'invoice',
      p_invoice_id, 'invoice', NULLIF(btrim(COALESCE(p_note, '')), ''), p_actor_user_id, 'completed'
    )
    RETURNING id INTO v_tx_id;

    SELECT ib.balance_rappen INTO v_balance
    FROM public.increment_balance(p_user_id, p_tenant_id, p_amount) AS ib;

    IF v_balance IS NULL THEN
      RAISE EXCEPTION 'wallet_increment_failed' USING ERRCODE = '23514';
    END IF;

    UPDATE public.credit_transactions
    SET balance_after_rappen = v_balance,
        balance_before_rappen = v_balance - p_amount
    WHERE id = v_tx_id;

    UPDATE public.invoices
    SET credit_applied_rappen = p_amount,
        credit_applied_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    WHERE id = p_invoice_id
      AND tenant_id = p_tenant_id
      AND user_id = p_user_id
      AND COALESCE(credit_applied_rappen, 0) = 0;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'invoice_credit_already_stamped' USING ERRCODE = '23514';
    END IF;

    RETURN jsonb_build_object(
      'ok', true,
      'applied', true,
      'already_applied', false,
      'amount_rappen', p_amount,
      'balance_rappen', v_balance
    );
  EXCEPTION
    WHEN unique_violation THEN
      GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
      IF v_constraint IS DISTINCT FROM 'credit_transactions_invoice_deposit_uidx' THEN
        RAISE;
      END IF;
      RETURN jsonb_build_object(
        'ok', true,
        'applied', false,
        'already_applied', true,
        'amount_rappen', p_amount
      );
  END;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.apply_identified_cash_overpayment(
  p_actor_user_id uuid,
  p_student_user_id uuid,
  p_idempotency_key text,
  p_amount integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $fn$
DECLARE
  v_actor public.users%ROWTYPE;
  v_key text := NULLIF(btrim(COALESCE(p_idempotency_key, '')), '');
  v_description text;
  v_tx_id uuid;
  v_existing_amount integer;
  v_existing_user uuid;
  v_balance integer;
  v_constraint text;
  v_note text;
BEGIN
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
  IF v_key IS NULL OR v_key !~ '^[A-Za-z0-9_-]{8,80}$' THEN
    RAISE EXCEPTION 'invalid_idempotency_key' USING ERRCODE = '22023';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_student_user_id
      AND tenant_id = v_actor.tenant_id
  ) THEN
    RAISE EXCEPTION 'user_not_in_tenant' USING ERRCODE = '42501';
  END IF;

  v_description := 'bulk-cash-overpay:' || v_key;
  v_note := 'Überzahlung bei Barzahlung (CHF ' || trim(to_char(p_amount / 100.0, 'FM999999990.00')) || ' Rückgeld)';

  SELECT ct.id, ct.amount_rappen, ct.user_id
    INTO v_tx_id, v_existing_amount, v_existing_user
  FROM public.credit_transactions ct
  WHERE ct.tenant_id = v_actor.tenant_id
    AND ct.description = v_description
    AND ct.transaction_type = 'deposit'
    AND ct.payment_method = 'cash'
    AND ct.reference_type = 'overpayment'
  LIMIT 1;

  IF v_tx_id IS NOT NULL THEN
    IF v_existing_user IS DISTINCT FROM p_student_user_id THEN
      RAISE EXCEPTION 'idempotency_user_mismatch' USING ERRCODE = '23514';
    END IF;
    RETURN jsonb_build_object(
      'ok', true,
      'applied', false,
      'already_applied', true,
      'amount_rappen', v_existing_amount
    );
  END IF;

  BEGIN
    INSERT INTO public.credit_transactions (
      user_id, tenant_id, transaction_type, amount_rappen,
      balance_before_rappen, balance_after_rappen, payment_method,
      reference_type, notes, description, created_by, status
    ) VALUES (
      p_student_user_id, v_actor.tenant_id, 'deposit', p_amount,
      0, 0, 'cash',
      'overpayment', v_note, v_description, p_actor_user_id, 'completed'
    )
    RETURNING id INTO v_tx_id;

    SELECT ib.balance_rappen INTO v_balance
    FROM public.increment_balance(p_student_user_id, v_actor.tenant_id, p_amount) AS ib;

    IF v_balance IS NULL THEN
      RAISE EXCEPTION 'wallet_increment_failed' USING ERRCODE = '23514';
    END IF;

    UPDATE public.credit_transactions
    SET balance_after_rappen = v_balance,
        balance_before_rappen = v_balance - p_amount
    WHERE id = v_tx_id;

    RETURN jsonb_build_object(
      'ok', true,
      'applied', true,
      'already_applied', false,
      'amount_rappen', p_amount,
      'balance_rappen', v_balance
    );
  EXCEPTION
    WHEN unique_violation THEN
      GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
      IF v_constraint IS DISTINCT FROM 'credit_transactions_bulk_cash_overpay_uidx' THEN
        RAISE;
      END IF;

      SELECT amount_rappen, user_id
        INTO v_existing_amount, v_existing_user
      FROM public.credit_transactions
      WHERE tenant_id = v_actor.tenant_id
        AND description = v_description
        AND transaction_type = 'deposit'
        AND payment_method = 'cash'
        AND reference_type = 'overpayment'
      LIMIT 1;

      IF v_existing_user IS DISTINCT FROM p_student_user_id THEN
        RAISE EXCEPTION 'idempotency_user_mismatch' USING ERRCODE = '23514';
      END IF;

      RETURN jsonb_build_object(
        'ok', true,
        'applied', false,
        'already_applied', true,
        'amount_rappen', COALESCE(v_existing_amount, p_amount)
      );
  END;
END;
$fn$;

REVOKE ALL ON FUNCTION public.settle_marked_invoice_payment_idempotent(uuid, uuid, integer, timestamptz, text, text, text, text, date, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.settle_marked_invoice_payment_idempotent(uuid, uuid, integer, timestamptz, text, text, text, text, date, text, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.settle_marked_invoice_payment_idempotent(uuid, uuid, integer, timestamptz, text, text, text, text, date, text, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.settle_marked_invoice_payment_idempotent(uuid, uuid, integer, timestamptz, text, text, text, text, date, text, text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.apply_invoice_product_credit(uuid, uuid, uuid, uuid, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_invoice_product_credit(uuid, uuid, uuid, uuid, integer, text) FROM anon;
REVOKE ALL ON FUNCTION public.apply_invoice_product_credit(uuid, uuid, uuid, uuid, integer, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_invoice_product_credit(uuid, uuid, uuid, uuid, integer, text) TO service_role;

REVOKE ALL ON FUNCTION public.apply_identified_cash_overpayment(uuid, uuid, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_identified_cash_overpayment(uuid, uuid, text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.apply_identified_cash_overpayment(uuid, uuid, text, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_identified_cash_overpayment(uuid, uuid, text, integer) TO service_role;

COMMENT ON FUNCTION public.settle_marked_invoice_payment_idempotent(uuid, uuid, integer, timestamptz, text, text, text, text, date, text, text, text, text) IS
  'Same settlement as settle_marked_invoice_payment. An optional action key returns the existing journal instead of booking again. A missing key does not deduplicate by amount.';

COMMENT ON FUNCTION public.apply_invoice_product_credit(uuid, uuid, uuid, uuid, integer, text) IS
  'One transaction for an invoice product-credit ledger row, the wallet balance, and the invoice stamp. A second call does not increment again.';

COMMENT ON FUNCTION public.apply_identified_cash_overpayment(uuid, uuid, text, integer) IS
  'One transaction for a keyed bulk cash surplus. The same action key does not deposit again. This is not the deferred staff-POS overpayment function.';

COMMIT;
