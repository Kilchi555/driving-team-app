-- Atomic idempotency for deferred-only staff-POS cash overpayment.
-- NOT APPLIED. Do not run this file against production from the PR.
-- Does not rewrite, delete, or merge existing rows.
-- Appointment cash overpayments keep a null description, so they stay
-- outside this partial index. Invoice and Wallee deposits are untouched.

DO $$
DECLARE
  v_predicate_duplicates integer;
  v_key_duplicates integer;
BEGIN
  SELECT count(*) INTO v_predicate_duplicates
  FROM (
    SELECT tenant_id, description
    FROM public.credit_transactions
    WHERE transaction_type = 'deposit'
      AND payment_method = 'cash'
      AND reference_type = 'overpayment'
      AND description LIKE 'staff-pos-deferred-overpay:%'
    GROUP BY tenant_id, description
    HAVING count(*) > 1
  ) duplicates;

  SELECT count(*) INTO v_key_duplicates
  FROM (
    SELECT tenant_id, description
    FROM public.credit_transactions
    WHERE description IS NOT NULL
      AND description LIKE 'staff-pos-deferred-overpay:%'
    GROUP BY tenant_id, description
    HAVING count(*) > 1
  ) duplicates;

  IF v_predicate_duplicates > 0 OR v_key_duplicates > 0 THEN
    RAISE EXCEPTION 'staff_pos_deferred_overpay_duplicates_exist';
  END IF;
END $$;

CREATE UNIQUE INDEX credit_transactions_staff_pos_deferred_overpay_uidx
  ON public.credit_transactions (tenant_id, description)
  WHERE transaction_type = 'deposit'
    AND payment_method = 'cash'
    AND reference_type = 'overpayment'
    AND description LIKE 'staff-pos-deferred-overpay:%';

CREATE OR REPLACE FUNCTION public.apply_staff_pos_deferred_cash_overpayment(
  p_user_id uuid,
  p_tenant_id uuid,
  p_amount integer,
  p_description text,
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
  v_constraint_name text;
BEGIN
  IF p_user_id IS NULL OR p_tenant_id IS NULL OR p_created_by IS NULL THEN
    RAISE EXCEPTION 'invalid_identity';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;
  IF p_description IS NULL OR p_description NOT LIKE 'staff-pos-deferred-overpay:%' THEN
    RAISE EXCEPTION 'invalid_description';
  END IF;
  IF p_note IS NULL OR char_length(btrim(p_note)) < 3 THEN
    RAISE EXCEPTION 'invalid_note';
  END IF;

  -- Insert and increment share this block. A unique violation rolls the
  -- insert back before the handler reads the winner. increment_balance is
  -- not called on that path.
  BEGIN
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
      'cash',
      NULL,
      'overpayment',
      btrim(p_note),
      p_description,
      p_created_by,
      'completed'
    )
    RETURNING id INTO v_tx_id;

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
    RETURN;
  EXCEPTION
    WHEN unique_violation THEN
      GET STACKED DIAGNOSTICS v_constraint_name = CONSTRAINT_NAME;
      IF v_constraint_name = 'credit_transactions_staff_pos_deferred_overpay_uidx' THEN
        SELECT ct.id, ct.amount_rappen, ct.user_id
          INTO v_tx_id, v_existing_amount, v_existing_user
        FROM public.credit_transactions ct
        WHERE ct.tenant_id = p_tenant_id
          AND ct.description = p_description
          AND ct.transaction_type = 'deposit'
          AND ct.payment_method = 'cash'
          AND ct.reference_type = 'overpayment'
        LIMIT 1;

        IF v_tx_id IS NULL THEN
          RAISE EXCEPTION 'idempotency_conflict';
        END IF;
        IF v_existing_user IS DISTINCT FROM p_user_id THEN
          RAISE EXCEPTION 'idempotency_user_mismatch';
        END IF;
        IF v_existing_amount IS DISTINCT FROM p_amount THEN
          RAISE EXCEPTION 'overpayment_amount_mismatch';
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
      RAISE;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_staff_pos_deferred_cash_overpayment(uuid, uuid, integer, text, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_staff_pos_deferred_cash_overpayment(uuid, uuid, integer, text, text, uuid)
  TO service_role;

COMMENT ON FUNCTION public.apply_staff_pos_deferred_cash_overpayment(uuid, uuid, integer, text, text, uuid) IS
  'Insert at most one deferred staff-POS cash overpayment per tenant and description key, then increment student_credits in the same transaction. Only credit_transactions_staff_pos_deferred_overpay_uidx is a replay. Any other unique violation aborts. service_role only. Not applied by this change set.';
