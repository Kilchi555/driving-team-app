-- Idempotent admin manual top-ups: one ledger row per (tenant, idempotency key).
-- Not applied by this change set. Do not run against production from the PR.
-- Does not rewrite existing rows. Cash deposits keep reference_type 'manual'
-- and a null reference_id, so they stay outside this partial index.
-- Does not replace increment_balance or the Wallee deposit function.

CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_manual_topup_idempotency_uidx
  ON public.credit_transactions (tenant_id, reference_id)
  WHERE transaction_type = 'deposit'
    AND payment_method = 'manual'
    AND reference_type = 'manual_topup'
    AND reference_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.apply_manual_credit_topup(
  p_user_id uuid,
  p_tenant_id uuid,
  p_idempotency_key uuid,
  p_amount integer,
  p_note text,
  p_created_by uuid
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
  v_tx_id uuid;
  v_existing_amount integer;
  v_existing_user uuid;
  v_balance integer;
BEGIN
  IF p_user_id IS NULL OR p_tenant_id IS NULL OR p_created_by IS NULL OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'invalid_identity';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 1000000 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;
  IF p_note IS NULL OR char_length(btrim(p_note)) < 3 OR char_length(btrim(p_note)) > 500 THEN
    RAISE EXCEPTION 'invalid_note';
  END IF;

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
    description,
    created_by,
    status
  ) VALUES (
    p_user_id,
    p_tenant_id,
    'deposit',
    p_amount,
    0,
    0,
    'manual',
    p_idempotency_key,
    'manual_topup',
    btrim(p_note),
    'Manuelle Guthaben-Aufladung: ' || btrim(p_note),
    p_created_by,
    'completed'
  )
  ON CONFLICT (tenant_id, reference_id)
    WHERE transaction_type = 'deposit'
      AND payment_method = 'manual'
      AND reference_type = 'manual_topup'
      AND reference_id IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_tx_id;

  IF v_tx_id IS NULL THEN
    SELECT ct.id, ct.amount_rappen, ct.user_id
      INTO v_tx_id, v_existing_amount, v_existing_user
    FROM public.credit_transactions ct
    WHERE ct.tenant_id = p_tenant_id
      AND ct.reference_id = p_idempotency_key
      AND ct.transaction_type = 'deposit'
      AND ct.payment_method = 'manual'
      AND ct.reference_type = 'manual_topup'
    LIMIT 1;

    IF v_tx_id IS NULL THEN
      RAISE EXCEPTION 'idempotency_conflict';
    END IF;
    IF v_existing_user IS DISTINCT FROM p_user_id THEN
      RAISE EXCEPTION 'idempotency_user_mismatch';
    END IF;

    SELECT sc.balance_rappen
      INTO v_balance
    FROM public.student_credits sc
    WHERE sc.user_id = p_user_id
      AND sc.tenant_id = p_tenant_id;

    applied := false;
    already_applied := true;
    amount_rappen := COALESCE(v_existing_amount, p_amount);
    balance_rappen := COALESCE(v_balance, 0);
    transaction_id := v_tx_id;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Insert first, then increment. Any exception rolls both back.
  SELECT ib.balance_rappen
    INTO v_balance
  FROM public.increment_balance(p_user_id, p_tenant_id, p_amount) AS ib;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'wallet_increment_failed';
  END IF;

  UPDATE public.credit_transactions
  SET
    balance_after_rappen = v_balance,
    balance_before_rappen = v_balance - p_amount
  WHERE id = v_tx_id;

  applied := true;
  already_applied := false;
  amount_rappen := p_amount;
  balance_rappen := v_balance;
  transaction_id := v_tx_id;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_manual_credit_topup(uuid, uuid, uuid, integer, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_manual_credit_topup(uuid, uuid, uuid, integer, text, uuid)
  TO service_role;

COMMENT ON FUNCTION public.apply_manual_credit_topup(uuid, uuid, uuid, integer, text, uuid) IS
  'Insert at most one manual admin top-up per tenant and idempotency key, then increment student_credits in the same transaction. A conflict returns the existing ledger row and does not move the balance. service_role only.';
