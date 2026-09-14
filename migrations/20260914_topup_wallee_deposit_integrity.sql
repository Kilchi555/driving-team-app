-- Idempotent Wallee top-up deposits: at most one deposit per payment,
-- applied together with an atomic wallet increment.
-- Does not rewrite existing rows. Partial unique index only covers
-- deposit + wallee + non-null reference_id (cash deposits keep null refs).

CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_wallee_deposit_reference_uidx
  ON public.credit_transactions (reference_id)
  WHERE transaction_type = 'deposit'
    AND payment_method = 'wallee'
    AND reference_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.apply_wallee_topup_deposit(
  p_payment_id uuid,
  p_user_id uuid,
  p_tenant_id uuid,
  p_amount integer
)
RETURNS TABLE(
  applied boolean,
  already_applied boolean,
  amount_rappen integer,
  balance_rappen integer,
  transaction_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_tx_id uuid;
  v_existing_amount integer;
  v_balance integer;
  v_amount integer;
  v_user_id uuid;
  v_tenant_id uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_not_found';
  END IF;

  -- Client params are untrusted. They may only match the locked payment row.
  IF v_payment.user_id IS DISTINCT FROM p_user_id
     OR v_payment.tenant_id IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'payment_identity_mismatch';
  END IF;

  IF v_payment.payment_method IS DISTINCT FROM 'wallee' THEN
    RAISE EXCEPTION 'not_wallee_payment';
  END IF;

  IF v_payment.appointment_id IS NOT NULL
     OR v_payment.invoice_id IS NOT NULL
     OR v_payment.course_registration_id IS NOT NULL
     OR COALESCE(v_payment.products_price_rappen, 0) <> 0 THEN
    RAISE EXCEPTION 'not_topup_payment';
  END IF;

  IF v_payment.description IS NULL
     OR v_payment.description NOT LIKE 'Guthaben aufladen%' THEN
    RAISE EXCEPTION 'not_topup_payment';
  END IF;

  -- create-topup-session stores the charged amount in lesson_price_rappen.
  -- Shop payments keep lesson_price_rappen = 0 even if the client spoofs description.
  IF COALESCE(v_payment.lesson_price_rappen, 0) IS DISTINCT FROM v_payment.total_amount_rappen THEN
    RAISE EXCEPTION 'not_topup_payment';
  END IF;

  IF jsonb_typeof(v_payment.metadata) = 'object'
     AND (
       v_payment.metadata ? 'course_id'
       OR v_payment.metadata ? 'products'
       OR v_payment.metadata ? 'appointment_id'
     ) THEN
    RAISE EXCEPTION 'not_topup_payment';
  END IF;

  IF v_payment.total_amount_rappen IS DISTINCT FROM p_amount THEN
    RAISE EXCEPTION 'amount_mismatch';
  END IF;

  -- Credit exclusively from the locked payment row, never from caller values.
  v_amount := v_payment.total_amount_rappen;
  v_user_id := v_payment.user_id;
  v_tenant_id := v_payment.tenant_id;

  INSERT INTO public.credit_transactions (
    user_id,
    tenant_id,
    transaction_type,
    amount_rappen,
    balance_before_rappen,
    balance_after_rappen,
    payment_method,
    reference_id,
    reference_type,
    notes,
    status
  ) VALUES (
    v_user_id,
    v_tenant_id,
    'deposit',
    v_amount,
    0,
    v_amount,
    'wallee',
    p_payment_id,
    'payment',
    'Online-Einzahlung via Wallee (CHF ' || to_char(v_amount / 100.0, 'FM999999990.00') || ')',
    'completed'
  )
  ON CONFLICT (reference_id)
    WHERE transaction_type = 'deposit'
      AND payment_method = 'wallee'
      AND reference_id IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_tx_id;

  IF v_tx_id IS NULL THEN
    SELECT ct.id, ct.amount_rappen
      INTO v_tx_id, v_existing_amount
    FROM public.credit_transactions ct
    WHERE ct.reference_id = p_payment_id
      AND ct.transaction_type = 'deposit'
      AND ct.payment_method = 'wallee'
    LIMIT 1;

    SELECT sc.balance_rappen
      INTO v_balance
    FROM public.student_credits sc
    WHERE sc.user_id = v_user_id
      AND sc.tenant_id = v_tenant_id;

    applied := false;
    already_applied := true;
    amount_rappen := COALESCE(v_existing_amount, v_amount);
    balance_rappen := COALESCE(v_balance, 0);
    transaction_id := v_tx_id;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Insert first, then increment. Any exception rolls both back.
  SELECT ib.balance_rappen
    INTO v_balance
  FROM public.increment_balance(v_user_id, v_tenant_id, v_amount) AS ib;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'wallet_increment_failed';
  END IF;

  UPDATE public.credit_transactions
  SET
    balance_after_rappen = v_balance,
    balance_before_rappen = v_balance - v_amount
  WHERE id = v_tx_id;

  applied := true;
  already_applied := false;
  amount_rappen := v_amount;
  balance_rappen := v_balance;
  transaction_id := v_tx_id;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_wallee_topup_deposit(uuid, uuid, uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_wallee_topup_deposit(uuid, uuid, uuid, integer)
  TO service_role;

COMMENT ON FUNCTION public.apply_wallee_topup_deposit(uuid, uuid, uuid, integer) IS
  'Atomically insert at most one Wallee top-up deposit and increment student_credits. Amount/user/tenant come from the locked payment row. service_role only.';
