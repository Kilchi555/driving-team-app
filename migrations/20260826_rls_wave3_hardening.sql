-- Unique redeem + tenant-scoped discount reads.

CREATE UNIQUE INDEX IF NOT EXISTS voucher_redemptions_voucher_user_uidx
  ON public.voucher_redemptions (voucher_id, user_id);

CREATE OR REPLACE FUNCTION public.redeem_promo_for_wallet(
  p_user_id uuid,
  p_tenant_id uuid,
  p_voucher_id uuid,
  p_amount integer
)
RETURNS TABLE(old_balance integer, new_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old integer;
  v_new integer;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  INSERT INTO public.voucher_redemptions (
    voucher_id, user_id, tenant_id, credit_amount_rappen, redeemed_at
  ) VALUES (
    p_voucher_id, p_user_id, p_tenant_id, p_amount, now()
  );

  UPDATE public.voucher_codes
  SET
    current_redemptions = COALESCE(current_redemptions, 0) + 1,
    updated_at = now()
  WHERE id = p_voucher_id
    AND tenant_id = p_tenant_id
    AND (max_redemptions IS NULL OR max_redemptions <= 0 OR COALESCE(current_redemptions, 0) < max_redemptions);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'voucher_exhausted';
  END IF;

  UPDATE public.student_credits
  SET balance_rappen = balance_rappen + p_amount, updated_at = now()
  WHERE user_id = p_user_id AND tenant_id = p_tenant_id
  RETURNING balance_rappen - p_amount, balance_rappen INTO v_old, v_new;

  IF NOT FOUND THEN
    INSERT INTO public.student_credits (user_id, tenant_id, balance_rappen, pending_withdrawal_rappen, updated_at)
    VALUES (p_user_id, p_tenant_id, p_amount, 0, now())
    ON CONFLICT (user_id, tenant_id) DO UPDATE
      SET
        balance_rappen = public.student_credits.balance_rappen + EXCLUDED.balance_rappen,
        updated_at = now()
    RETURNING balance_rappen - p_amount, balance_rappen INTO v_old, v_new;
  END IF;

  old_balance := v_old;
  new_balance := v_new;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_gift_card_for_wallet(
  p_user_id uuid,
  p_tenant_id uuid,
  p_code text
)
RETURNS TABLE(old_balance integer, new_balance integer, amount_rappen integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount integer;
  v_old integer;
  v_new integer;
BEGIN
  UPDATE public.vouchers
  SET
    redeemed_at = now(),
    redeemed_by = p_user_id,
    is_active = false
  WHERE tenant_id = p_tenant_id
    AND redeemed_at IS NULL
    AND upper(code) = upper(trim(p_code))
  RETURNING public.vouchers.amount_rappen INTO v_amount;

  IF NOT FOUND OR v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'already_redeemed';
  END IF;

  UPDATE public.student_credits
  SET balance_rappen = balance_rappen + v_amount, updated_at = now()
  WHERE user_id = p_user_id AND tenant_id = p_tenant_id
  RETURNING balance_rappen - v_amount, balance_rappen INTO v_old, v_new;

  IF NOT FOUND THEN
    INSERT INTO public.student_credits (user_id, tenant_id, balance_rappen, pending_withdrawal_rappen, updated_at)
    VALUES (p_user_id, p_tenant_id, v_amount, 0, now())
    ON CONFLICT (user_id, tenant_id) DO UPDATE
      SET
        balance_rappen = public.student_credits.balance_rappen + EXCLUDED.balance_rappen,
        updated_at = now()
    RETURNING balance_rappen - v_amount, balance_rappen INTO v_old, v_new;
  END IF;

  old_balance := v_old;
  new_balance := v_new;
  amount_rappen := v_amount;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_promo_for_wallet(uuid, uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.redeem_gift_card_for_wallet(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_promo_for_wallet(uuid, uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.redeem_gift_card_for_wallet(uuid, uuid, text) TO service_role;

DROP POLICY IF EXISTS discounts_allow_authenticated_read ON public.discounts;
DROP POLICY IF EXISTS discounts_select_auth ON public.discounts;

DROP POLICY IF EXISTS discounts_select_tenant ON public.discounts;
CREATE POLICY discounts_select_tenant ON public.discounts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND (
          u.role = 'super_admin'
          OR u.tenant_id = discounts.tenant_id
        )
    )
  );
