-- Gift-card reserve-at-apply, atomic usage release, and client payment-status lock.
-- Server uses service_role (bypasses RLS). Trigger still applies to authenticated.

ALTER TABLE public.vouchers
  ADD COLUMN IF NOT EXISTS reserved_at timestamptz,
  ADD COLUMN IF NOT EXISTS reserved_until timestamptz,
  ADD COLUMN IF NOT EXISTS reserved_for_payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vouchers_reserved_payment
  ON public.vouchers (reserved_for_payment_id)
  WHERE reserved_for_payment_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.reserve_gift_card_for_payment(
  p_tenant_id uuid,
  p_code text,
  p_payment_id uuid,
  p_ttl_minutes integer DEFAULT 45
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_redeemed timestamptz;
  v_reserved_until timestamptz;
  v_reserved_for uuid;
  v_ttl integer;
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) = 0 OR p_payment_id IS NULL THEN
    RETURN 'not_found';
  END IF;

  v_ttl := GREATEST(5, LEAST(COALESCE(p_ttl_minutes, 45), 180));

  SELECT id, redeemed_at, reserved_until, reserved_for_payment_id
    INTO v_id, v_redeemed, v_reserved_until, v_reserved_for
  FROM public.vouchers
  WHERE tenant_id = p_tenant_id
    AND upper(code) = upper(trim(p_code))
    AND is_active = true
  LIMIT 1;

  IF v_id IS NULL THEN
    RETURN 'not_found';
  END IF;
  IF v_redeemed IS NOT NULL THEN
    RETURN 'already_redeemed';
  END IF;
  IF v_reserved_for IS NOT NULL
     AND v_reserved_for IS DISTINCT FROM p_payment_id
     AND v_reserved_until IS NOT NULL
     AND v_reserved_until > now() THEN
    RETURN 'held_by_other';
  END IF;

  UPDATE public.vouchers
  SET
    reserved_at = now(),
    reserved_until = now() + make_interval(mins => v_ttl),
    reserved_for_payment_id = p_payment_id,
    updated_at = now()
  WHERE id = v_id
    AND redeemed_at IS NULL
    AND (
      reserved_for_payment_id IS NULL
      OR reserved_for_payment_id = p_payment_id
      OR reserved_until IS NULL
      OR reserved_until <= now()
    );

  IF NOT FOUND THEN
    RETURN 'held_by_other';
  END IF;
  IF v_reserved_for = p_payment_id THEN
    RETURN 'already_reserved';
  END IF;
  RETURN 'reserved';
END;
$$;

CREATE OR REPLACE FUNCTION public.release_gift_card_reservation(p_payment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.vouchers
  SET
    reserved_at = NULL,
    reserved_until = NULL,
    reserved_for_payment_id = NULL,
    updated_at = now()
  WHERE reserved_for_payment_id = p_payment_id
    AND redeemed_at IS NULL;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_gift_card_for_payment(
  p_tenant_id uuid,
  p_code text,
  p_payment_id uuid DEFAULT NULL,
  p_redeemed_by uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.vouchers
  SET
    redeemed_at = now(),
    redeemed_by = p_redeemed_by,
    is_active = false,
    reserved_at = NULL,
    reserved_until = NULL,
    reserved_for_payment_id = NULL,
    updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND upper(code) = upper(trim(p_code))
    AND redeemed_at IS NULL
    AND (
      (p_payment_id IS NULL AND reserved_for_payment_id IS NULL)
      OR (p_payment_id IS NOT NULL AND (
        reserved_for_payment_id IS NULL
        OR reserved_for_payment_id = p_payment_id
      ))
    );
  RETURN FOUND;
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
    is_active = false,
    reserved_at = NULL,
    reserved_until = NULL,
    reserved_for_payment_id = NULL
  WHERE tenant_id = p_tenant_id
    AND redeemed_at IS NULL
    AND upper(code) = upper(trim(p_code))
    AND reserved_for_payment_id IS NULL
  RETURNING public.vouchers.amount_rappen INTO v_amount;

  IF NOT FOUND OR v_amount IS NULL OR v_amount <= 0 THEN
    IF EXISTS (
      SELECT 1 FROM public.vouchers
      WHERE tenant_id = p_tenant_id
        AND upper(code) = upper(trim(p_code))
        AND redeemed_at IS NULL
        AND reserved_for_payment_id IS NOT NULL
        AND reserved_until IS NOT NULL
        AND reserved_until > now()
    ) THEN
      RAISE EXCEPTION 'held_by_other';
    END IF;
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

CREATE OR REPLACE FUNCTION public.decrement_discount_usage(p_discount_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.discounts
  SET usage_count = GREATEST(0, COALESCE(usage_count, 0) - 1)
  WHERE id = p_discount_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_voucher_code_redemption(p_voucher_code_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.voucher_codes
  SET
    current_redemptions = GREATEST(0, COALESCE(current_redemptions, 0) - 1),
    updated_at = now()
  WHERE id = p_voucher_code_id;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_gift_card_for_payment(uuid, text, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_gift_card_reservation(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_gift_card_for_payment(uuid, text, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decrement_discount_usage(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decrement_voucher_code_redemption(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.redeem_gift_card_for_wallet(uuid, uuid, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reserve_gift_card_for_payment(uuid, text, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_gift_card_reservation(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_gift_card_for_payment(uuid, text, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrement_discount_usage(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrement_voucher_code_redemption(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.redeem_gift_card_for_wallet(uuid, uuid, text) TO service_role;

-- Clients must not mark their own payments completed or change amounts.
DROP POLICY IF EXISTS "clients_update_own_payments" ON public.payments;
DROP POLICY IF EXISTS "clients_delete_own_payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can update their own payments" ON public.payments;

-- Clients cannot mark payments completed or change settlement amounts.
-- Staff still complete cash via client writes on some admin screens; lock only clients
-- until those paths all go through service_role.
CREATE OR REPLACE FUNCTION public.prevent_client_payment_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND current_setting('role', true) IN ('authenticated', 'anon')
     AND EXISTS (
       SELECT 1 FROM public.users u
       WHERE u.auth_user_id = auth.uid()
         AND u.role = 'client'
     )
     AND (
       NEW.payment_status IS DISTINCT FROM OLD.payment_status
       OR NEW.total_amount_rappen IS DISTINCT FROM OLD.total_amount_rappen
       OR NEW.discount_amount_rappen IS DISTINCT FROM OLD.discount_amount_rappen
     ) THEN
    RAISE EXCEPTION 'clients_cannot_mutate_payment_settlement';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_client_payment_mutation ON public.payments;
CREATE TRIGGER trg_prevent_client_payment_mutation
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_client_payment_mutation();

CREATE OR REPLACE FUNCTION public.release_checkout_benefits_on_payment_close()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_disc uuid;
  v_voucher uuid;
BEGIN
  IF NEW.payment_status IS NOT DISTINCT FROM OLD.payment_status THEN
    RETURN NEW;
  END IF;
  IF NEW.payment_status NOT IN ('cancelled', 'failed') THEN
    RETURN NEW;
  END IF;
  IF OLD.payment_status NOT IN ('pending', 'processing') THEN
    RETURN NEW;
  END IF;

  PERFORM public.release_gift_card_reservation(NEW.id);

  IF COALESCE(NEW.metadata->>'discount_usage_claimed', '') = 'true' THEN
    v_code := NULLIF(trim(NEW.metadata->>'discount_code'), '');
    IF v_code IS NOT NULL AND NEW.tenant_id IS NOT NULL THEN
      SELECT id INTO v_disc
      FROM public.discounts
      WHERE tenant_id = NEW.tenant_id AND upper(code) = upper(v_code)
      LIMIT 1;
      IF v_disc IS NOT NULL THEN
        PERFORM public.decrement_discount_usage(v_disc);
      ELSE
        SELECT id INTO v_voucher
        FROM public.voucher_codes
        WHERE tenant_id = NEW.tenant_id AND upper(code) = upper(v_code)
        LIMIT 1;
        IF v_voucher IS NOT NULL THEN
          PERFORM public.decrement_voucher_code_redemption(v_voucher);
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_release_checkout_benefits ON public.payments;
CREATE TRIGGER trg_release_checkout_benefits
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.release_checkout_benefits_on_payment_close();
