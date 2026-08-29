-- Atomic wallet / discount counters. Callable by service_role only.

CREATE OR REPLACE FUNCTION public.deduct_student_credit(
  p_user_id uuid,
  p_tenant_id uuid,
  p_amount integer
)
RETURNS TABLE(balance_rappen integer, pending_withdrawal_rappen integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  RETURN QUERY
  UPDATE public.student_credits sc
  SET
    balance_rappen = sc.balance_rappen - p_amount,
    updated_at = now()
  WHERE sc.user_id = p_user_id
    AND sc.tenant_id = p_tenant_id
    AND sc.balance_rappen - COALESCE(sc.pending_withdrawal_rappen, 0) >= p_amount
  RETURNING sc.balance_rappen, sc.pending_withdrawal_rappen;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient_available_credit';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_balance(
  p_user_id uuid,
  p_tenant_id uuid,
  p_amount integer
)
RETURNS TABLE(balance_rappen integer, pending_withdrawal_rappen integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.student_credits%ROWTYPE;
BEGIN
  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  UPDATE public.student_credits sc
  SET
    balance_rappen = sc.balance_rappen + p_amount,
    updated_at = now()
  WHERE sc.user_id = p_user_id
    AND sc.tenant_id = p_tenant_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    IF p_amount < 0 THEN
      RAISE EXCEPTION 'insufficient_available_credit';
    END IF;
    INSERT INTO public.student_credits (user_id, tenant_id, balance_rappen, pending_withdrawal_rappen, updated_at)
    VALUES (p_user_id, p_tenant_id, p_amount, 0, now())
    ON CONFLICT (user_id, tenant_id) DO UPDATE
      SET
        balance_rappen = public.student_credits.balance_rappen + EXCLUDED.balance_rappen,
        updated_at = now()
    RETURNING * INTO v_row;
  END IF;

  balance_rappen := v_row.balance_rappen;
  pending_withdrawal_rappen := COALESCE(v_row.pending_withdrawal_rappen, 0);
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_pending_withdrawal(
  p_credit_id uuid,
  p_amount integer
)
RETURNS TABLE(balance_rappen integer, pending_withdrawal_rappen integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  RETURN QUERY
  UPDATE public.student_credits sc
  SET
    pending_withdrawal_rappen = COALESCE(sc.pending_withdrawal_rappen, 0) + p_amount,
    last_withdrawal_at = now(),
    updated_at = now()
  WHERE sc.id = p_credit_id
    AND sc.balance_rappen - COALESCE(sc.pending_withdrawal_rappen, 0) >= p_amount
  RETURNING sc.balance_rappen, sc.pending_withdrawal_rappen;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient_available_credit';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_discount_usage(p_discount_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.discounts
  SET usage_count = COALESCE(usage_count, 0) + 1
  WHERE id = p_discount_id
    AND (usage_limit IS NULL OR usage_limit <= 0 OR COALESCE(usage_count, 0) < usage_limit);

  IF NOT FOUND THEN
    RETURN false;
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_voucher_code_redemption(p_voucher_code_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.voucher_codes
  SET
    current_redemptions = COALESCE(current_redemptions, 0) + 1,
    updated_at = now()
  WHERE id = p_voucher_code_id
    AND (max_redemptions IS NULL OR max_redemptions <= 0 OR COALESCE(current_redemptions, 0) < max_redemptions);

  IF NOT FOUND THEN
    RETURN false;
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_voucher_redemptions()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Usage is incremented atomically by increment_voucher_code_redemption()
  -- before the redemption row is inserted. Keep this trigger as a no-op
  -- so history inserts do not double-count.
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.deduct_student_credit(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_balance(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_pending_withdrawal(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_discount_usage(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_voucher_code_redemption(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.deduct_student_credit(uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_balance(uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_pending_withdrawal(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_discount_usage(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_voucher_code_redemption(uuid) TO service_role;
