-- Wallee checkout claim / recovery state machine.
-- SAFETY > LIVENESS: stale or unknown creates become recovery_pending and
-- never authorize a second TransactionService.create.
--
-- Not applied to production by this change. No EXCLUDE. No overlap remediation.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS checkout_status text NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS checkout_claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS checkout_claim_token uuid,
  ADD COLUMN IF NOT EXISTS checkout_merchant_reference text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payments_checkout_status_check'
      AND conrelid = 'public.payments'::regclass
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_checkout_status_check
      CHECK (checkout_status IN ('idle', 'creating', 'created', 'recovery_pending'));
  END IF;
END
$$;

UPDATE public.payments
SET
  checkout_status = 'created',
  checkout_merchant_reference = COALESCE(checkout_merchant_reference, 'payment-' || id::text)
WHERE wallee_transaction_id IS NOT NULL
  AND checkout_status = 'idle';

CREATE INDEX IF NOT EXISTS payments_checkout_recovery_idx
  ON public.payments (tenant_id, checkout_status, checkout_claimed_at)
  WHERE checkout_status IN ('creating', 'recovery_pending');

CREATE OR REPLACE FUNCTION public.claim_payment_checkout(
  p_payment_id uuid,
  p_tenant_id uuid,
  p_stale_after interval DEFAULT interval '90 seconds'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_row public.payments%ROWTYPE;
  v_token uuid;
  v_ref text;
  v_stale boolean;
BEGIN
  IF p_payment_id IS NULL OR p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'payment_id and tenant_id required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_row
  FROM public.payments
  WHERE id = p_payment_id
    AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'not_found');
  END IF;

  IF v_row.wallee_transaction_id IS NOT NULL THEN
    UPDATE public.payments
    SET
      checkout_status = 'created',
      checkout_merchant_reference = COALESCE(checkout_merchant_reference, 'payment-' || id::text),
      updated_at = now()
    WHERE id = v_row.id
    RETURNING * INTO v_row;

    RETURN jsonb_build_object(
      'outcome', 'reuse',
      'allow_create', false,
      'payment_id', v_row.id,
      'tenant_id', v_row.tenant_id,
      'payment_status', v_row.payment_status,
      'checkout_status', v_row.checkout_status,
      'checkout_claim_token', v_row.checkout_claim_token,
      'checkout_merchant_reference', v_row.checkout_merchant_reference,
      'wallee_transaction_id', v_row.wallee_transaction_id,
      'wallee_space_id', v_row.wallee_space_id,
      'appointment_id', v_row.appointment_id
    );
  END IF;

  IF v_row.payment_status NOT IN ('pending', 'processing') THEN
    RETURN jsonb_build_object(
      'outcome', 'blocked',
      'allow_create', false,
      'payment_status', v_row.payment_status,
      'checkout_status', v_row.checkout_status
    );
  END IF;

  v_ref := COALESCE(v_row.checkout_merchant_reference, 'payment-' || v_row.id::text);
  v_stale := v_row.checkout_claimed_at IS NOT NULL
    AND v_row.checkout_claimed_at < (now() - p_stale_after);

  IF v_row.checkout_status = 'recovery_pending'
     OR (v_row.checkout_status = 'creating' AND v_stale) THEN
    UPDATE public.payments
    SET
      checkout_status = 'recovery_pending',
      checkout_merchant_reference = v_ref,
      checkout_claimed_at = now(),
      updated_at = now()
    WHERE id = v_row.id
    RETURNING * INTO v_row;

    RETURN jsonb_build_object(
      'outcome', 'recovery',
      'allow_create', false,
      'payment_id', v_row.id,
      'tenant_id', v_row.tenant_id,
      'payment_status', v_row.payment_status,
      'checkout_status', 'recovery_pending',
      'checkout_claim_token', v_row.checkout_claim_token,
      'checkout_merchant_reference', v_ref,
      'wallee_transaction_id', v_row.wallee_transaction_id,
      'wallee_space_id', v_row.wallee_space_id,
      'appointment_id', v_row.appointment_id
    );
  END IF;

  IF v_row.checkout_status = 'creating' AND NOT v_stale THEN
    RETURN jsonb_build_object(
      'outcome', 'in_progress',
      'allow_create', false,
      'payment_id', v_row.id,
      'tenant_id', v_row.tenant_id,
      'payment_status', v_row.payment_status,
      'checkout_status', 'creating',
      'checkout_merchant_reference', v_ref,
      'appointment_id', v_row.appointment_id
    );
  END IF;

  IF v_row.checkout_status IN ('idle', 'created') THEN
    v_token := gen_random_uuid();
    UPDATE public.payments
    SET
      checkout_status = 'creating',
      checkout_claim_token = v_token,
      checkout_claimed_at = now(),
      checkout_merchant_reference = v_ref,
      updated_at = now()
    WHERE id = v_row.id
      AND wallee_transaction_id IS NULL
      AND checkout_status IN ('idle', 'created')
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('outcome', 'in_progress', 'allow_create', false);
    END IF;

    RETURN jsonb_build_object(
      'outcome', 'allow_create',
      'allow_create', true,
      'payment_id', v_row.id,
      'tenant_id', v_row.tenant_id,
      'payment_status', v_row.payment_status,
      'checkout_status', 'creating',
      'checkout_claim_token', v_token,
      'checkout_merchant_reference', v_ref,
      'wallee_transaction_id', v_row.wallee_transaction_id,
      'wallee_space_id', v_row.wallee_space_id,
      'appointment_id', v_row.appointment_id
    );
  END IF;

  RETURN jsonb_build_object(
    'outcome', 'in_progress',
    'allow_create', false,
    'checkout_status', v_row.checkout_status
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.persist_payment_checkout(
  p_payment_id uuid,
  p_tenant_id uuid,
  p_wallee_transaction_id text,
  p_wallee_space_id text,
  p_claim_token uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_row public.payments%ROWTYPE;
BEGIN
  IF p_payment_id IS NULL OR p_tenant_id IS NULL OR p_wallee_transaction_id IS NULL THEN
    RAISE EXCEPTION 'payment_id, tenant_id and transaction id required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_row
  FROM public.payments
  WHERE id = p_payment_id
    AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'not_found');
  END IF;

  IF v_row.wallee_transaction_id IS NOT NULL
     AND v_row.wallee_transaction_id IS DISTINCT FROM p_wallee_transaction_id THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'wallee_transaction_id', v_row.wallee_transaction_id,
      'checkout_status', v_row.checkout_status
    );
  END IF;

  UPDATE public.payments
  SET
    wallee_transaction_id = p_wallee_transaction_id,
    wallee_space_id = COALESCE(p_wallee_space_id, wallee_space_id),
    checkout_status = 'created',
    checkout_merchant_reference = COALESCE(checkout_merchant_reference, 'payment-' || id::text),
    payment_method = COALESCE(payment_method, 'wallee'),
    payment_provider = COALESCE(payment_provider, 'wallee'),
    updated_at = now()
  WHERE id = v_row.id
    AND (wallee_transaction_id IS NULL OR wallee_transaction_id = p_wallee_transaction_id)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'outcome', 'created',
    'payment_id', v_row.id,
    'wallee_transaction_id', v_row.wallee_transaction_id,
    'checkout_status', 'created'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_payment_checkout_recovery(
  p_payment_id uuid,
  p_tenant_id uuid,
  p_claim_token uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_row public.payments%ROWTYPE;
BEGIN
  UPDATE public.payments
  SET
    checkout_status = 'recovery_pending',
    checkout_merchant_reference = COALESCE(checkout_merchant_reference, 'payment-' || id::text),
    checkout_claimed_at = now(),
    updated_at = now()
  WHERE id = p_payment_id
    AND tenant_id = p_tenant_id
    AND wallee_transaction_id IS NULL
    AND (
      p_claim_token IS NULL
      OR checkout_claim_token IS NULL
      OR checkout_claim_token = p_claim_token
    )
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    SELECT * INTO v_row
    FROM public.payments
    WHERE id = p_payment_id AND tenant_id = p_tenant_id;
  END IF;

  RETURN jsonb_build_object(
    'outcome', CASE WHEN v_row.wallee_transaction_id IS NOT NULL THEN 'created' ELSE 'recovery' END,
    'checkout_status', COALESCE(v_row.checkout_status, 'recovery_pending'),
    'wallee_transaction_id', v_row.wallee_transaction_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.release_payment_checkout_claim(
  p_payment_id uuid,
  p_tenant_id uuid,
  p_claim_token uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_row public.payments%ROWTYPE;
BEGIN
  UPDATE public.payments
  SET
    checkout_status = 'idle',
    checkout_claim_token = NULL,
    checkout_claimed_at = NULL,
    updated_at = now()
  WHERE id = p_payment_id
    AND tenant_id = p_tenant_id
    AND checkout_status = 'creating'
    AND wallee_transaction_id IS NULL
    AND checkout_claim_token = p_claim_token
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'unchanged');
  END IF;

  RETURN jsonb_build_object('outcome', 'idle', 'checkout_status', 'idle');
END;
$$;

DROP FUNCTION IF EXISTS public.acquire_payment_checkout_lock(uuid);
DROP FUNCTION IF EXISTS public.release_payment_checkout_lock(uuid);

REVOKE ALL ON FUNCTION public.claim_payment_checkout(uuid, uuid, interval) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.persist_payment_checkout(uuid, uuid, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_payment_checkout_recovery(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_payment_checkout_claim(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_payment_checkout(uuid, uuid, interval) TO service_role;
GRANT EXECUTE ON FUNCTION public.persist_payment_checkout(uuid, uuid, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_payment_checkout_recovery(uuid, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_payment_checkout_claim(uuid, uuid, uuid) TO service_role;
