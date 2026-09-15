-- Slice 5: atomic staff-appointment credit apply.
-- Do not change deduct_student_credit / increment_balance / add_pending_withdrawal.
-- Not executed by this change set; apply separately.

CREATE UNIQUE INDEX IF NOT EXISTS credit_tx_staff_appointment_credit_payment_uidx
  ON public.credit_transactions (reference_id)
  WHERE reference_type = 'payment'
    AND transaction_type = 'staff_appointment_credit';

CREATE OR REPLACE FUNCTION public.apply_credit_to_payment(
  p_payment_id uuid,
  p_tenant_id uuid,
  p_requested_rappen integer,
  p_actor_user_id uuid
)
RETURNS TABLE(
  payment_id uuid,
  credit_used_rappen integer,
  remaining_amount_rappen integer,
  payment_status text,
  credit_to_use_rappen integer,
  credit_transaction_id uuid,
  applied boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_existing public.credit_transactions%ROWTYPE;
  v_credit public.student_credits%ROWTYPE;
  v_requested integer;
  v_payable integer;
  v_already integer;
  v_capacity integer;
  v_available integer;
  v_use integer;
  v_new_used integer;
  v_remaining integer;
  v_new_status text;
  v_tx_id uuid;
  v_applied boolean := false;
  v_before integer;
  v_after integer;
BEGIN
  IF p_payment_id IS NULL OR p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'payment_not_found';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
    AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_not_found';
  END IF;

  SELECT * INTO v_existing
  FROM public.credit_transactions
  WHERE reference_id = v_payment.id
    AND reference_type = 'payment'
    AND transaction_type = 'staff_appointment_credit'
  LIMIT 1;

  v_payable := GREATEST(0, COALESCE(v_payment.total_amount_rappen, 0));
  v_already := GREATEST(0, COALESCE(v_payment.credit_used_rappen, 0));
  v_remaining := GREATEST(0, v_payable - v_already);

  IF v_existing.id IS NOT NULL THEN
    payment_id := v_payment.id;
    credit_used_rappen := v_already;
    remaining_amount_rappen := v_remaining;
    payment_status := v_payment.payment_status;
    credit_to_use_rappen := 0;
    credit_transaction_id := v_existing.id;
    applied := false;
    RETURN NEXT;
    RETURN;
  END IF;

  v_requested := GREATEST(0, COALESCE(p_requested_rappen, 0));
  v_capacity := GREATEST(0, v_payable - v_already);
  v_use := 0;

  IF v_requested > 0
     AND v_capacity > 0
     AND v_payment.user_id IS NOT NULL
     AND COALESCE(v_payment.payment_status, 'pending') IN ('pending', 'processing', 'partial')
  THEN
    SELECT * INTO v_credit
    FROM public.student_credits
    WHERE user_id = v_payment.user_id
      AND tenant_id = p_tenant_id
    FOR UPDATE;

    v_available := 0;
    IF FOUND THEN
      v_available := GREATEST(
        0,
        COALESCE(v_credit.balance_rappen, 0) - COALESCE(v_credit.pending_withdrawal_rappen, 0)
      );
    END IF;

    v_use := LEAST(v_available, v_capacity, v_requested);

    IF v_use > 0 THEN
      BEGIN
        UPDATE public.student_credits sc
        SET
          balance_rappen = sc.balance_rappen - v_use,
          updated_at = now()
        WHERE sc.id = v_credit.id
          AND sc.user_id = v_payment.user_id
          AND sc.tenant_id = p_tenant_id
          AND sc.balance_rappen - COALESCE(sc.pending_withdrawal_rappen, 0) >= v_use
        RETURNING sc.balance_rappen + v_use, sc.balance_rappen INTO v_before, v_after;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'insufficient_available_credit';
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
          created_by,
          notes,
          status,
          created_at
        ) VALUES (
          v_payment.user_id,
          p_tenant_id,
          'staff_appointment_credit',
          -v_use,
          v_before,
          v_after,
          'credit',
          v_payment.id,
          'payment',
          p_actor_user_id,
          'Guthaben für Staff-Terminzahlung',
          'completed',
          now()
        )
        RETURNING id INTO v_tx_id;

        v_new_used := v_already + v_use;
        v_remaining := GREATEST(0, v_payable - v_new_used);
        v_new_status := v_payment.payment_status;
        IF v_remaining = 0 THEN
          v_new_status := 'completed';
        END IF;

        UPDATE public.payments
        SET
          credit_used_rappen = v_new_used,
          credit_transaction_id = v_tx_id,
          payment_status = v_new_status,
          payment_method = CASE
            WHEN v_remaining = 0 THEN 'credit'
            ELSE payment_method
          END,
          paid_at = CASE
            WHEN v_remaining = 0 THEN COALESCE(paid_at, now())
            ELSE paid_at
          END,
          updated_at = now()
        WHERE id = v_payment.id
          AND tenant_id = p_tenant_id;

        v_already := v_new_used;
        v_applied := true;
      EXCEPTION
        WHEN unique_violation THEN
          -- Concurrent duplicate: this subtransaction rolls back wallet+ledger.
          SELECT * INTO v_existing
          FROM public.credit_transactions
          WHERE reference_id = v_payment.id
            AND reference_type = 'payment'
            AND transaction_type = 'staff_appointment_credit'
          LIMIT 1;

          SELECT
            GREATEST(0, COALESCE(credit_used_rappen, 0)),
            payment_status
          INTO v_already, v_new_status
          FROM public.payments
          WHERE id = v_payment.id
            AND tenant_id = p_tenant_id;

          v_use := 0;
          v_applied := false;
          v_tx_id := v_existing.id;
      END;
    END IF;
  END IF;

  payment_id := v_payment.id;
  credit_used_rappen := v_already;
  remaining_amount_rappen := GREATEST(0, v_payable - v_already);
  credit_to_use_rappen := v_use;
  credit_transaction_id := v_tx_id;
  applied := v_applied;
  payment_status := COALESCE(v_new_status, v_payment.payment_status);
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_credit_to_payment(uuid, uuid, integer, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_credit_to_payment(uuid, uuid, integer, uuid)
  TO service_role;
