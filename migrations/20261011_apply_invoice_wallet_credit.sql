-- Atomic invoice → wallet credit:
--   lock invoice + wallet, insert idempotent ledger row, increment balance,
--   stamp invoices.credit_applied_rappen — all in ONE transaction.
--
-- NOT applied by this PR. Apply only via approved non-production then production rollout.
-- Does not rewrite historical rows. Unique index is IF NOT EXISTS (safe if already present
-- from 20261011_invoice_settlement_post_commit.sql).

-- Idempotency key for completed invoice wallet deposits (tenant + invoice).
CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_invoice_deposit_uidx
  ON public.credit_transactions (tenant_id, reference_id)
  WHERE reference_type = 'invoice'
    AND transaction_type IN ('deposit', 'credit_product_purchase')
    AND status = 'completed';

CREATE OR REPLACE FUNCTION public.apply_invoice_wallet_credit(
  p_tenant_id uuid,
  p_invoice_id uuid,
  p_user_id uuid,
  p_actor_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_wallet public.student_credits%ROWTYPE;
  v_existing public.credit_transactions%ROWTYPE;
  v_amount integer;
  v_before integer;
  v_after integer;
  v_ledger_id uuid;
  v_invoice_number text;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'apply_invoice_wallet_credit_service_role_only' USING ERRCODE = '42501';
  END IF;

  IF p_tenant_id IS NULL OR p_invoice_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'apply_invoice_wallet_credit_missing_args' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id = p_invoice_id
    AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'apply_invoice_wallet_credit_invoice_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_invoice.user_id IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'apply_invoice_wallet_credit_user_mismatch' USING ERRCODE = '42501';
  END IF;

  IF coalesce(v_invoice.payment_status, '') <> 'paid' THEN
    RAISE EXCEPTION 'apply_invoice_wallet_credit_invoice_not_paid' USING ERRCODE = 'P0001';
  END IF;

  IF coalesce(v_invoice.credit_applied_rappen, 0) > 0 THEN
    RETURN jsonb_build_object(
      'ok', true,
      'outcome', 'already_applied',
      'applied_rappen', 0,
      'skipped', true,
      'credit_applied_rappen', v_invoice.credit_applied_rappen,
      'ledger_id', NULL
    );
  END IF;

  SELECT * INTO v_existing
  FROM public.credit_transactions
  WHERE tenant_id = p_tenant_id
    AND reference_id = p_invoice_id
    AND reference_type = 'invoice'
    AND transaction_type IN ('deposit', 'credit_product_purchase')
    AND status = 'completed'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    -- Do NOT treat existence alone as success without verifying identity.
    IF v_existing.tenant_id IS DISTINCT FROM p_tenant_id
       OR v_existing.user_id IS DISTINCT FROM p_user_id
       OR v_existing.reference_id IS DISTINCT FROM p_invoice_id
       OR v_existing.reference_type IS DISTINCT FROM 'invoice' THEN
      RAISE EXCEPTION 'apply_invoice_wallet_credit_ledger_mismatch' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.invoices
    SET
      credit_applied_rappen = greatest(coalesce(v_existing.amount_rappen, 0), 0),
      credit_applied_at = coalesce(credit_applied_at, now()),
      updated_at = now()
    WHERE id = p_invoice_id
      AND tenant_id = p_tenant_id
      AND coalesce(credit_applied_rappen, 0) = 0;

    RETURN jsonb_build_object(
      'ok', true,
      'outcome', 'already_applied',
      'applied_rappen', 0,
      'skipped', true,
      'credit_applied_rappen', greatest(coalesce(v_existing.amount_rappen, 0), 0),
      'ledger_id', v_existing.id
    );
  END IF;

  SELECT coalesce(sum(greatest(coalesce(credit_amount_rappen, 0), 0)), 0)::integer
    INTO v_amount
  FROM public.invoice_items
  WHERE invoice_id = p_invoice_id
    AND credit_to_wallet IS TRUE;

  IF v_amount IS NULL OR v_amount <= 0 THEN
    RETURN jsonb_build_object(
      'ok', true,
      'outcome', 'skipped_no_credit',
      'applied_rappen', 0,
      'skipped', true,
      'ledger_id', NULL
    );
  END IF;

  v_invoice_number := coalesce(nullif(v_invoice.invoice_number, ''), p_invoice_id::text);

  -- Ensure wallet row exists, then lock it to serialize concurrent distinct credits.
  INSERT INTO public.student_credits (user_id, tenant_id, balance_rappen, notes, updated_at)
  VALUES (p_user_id, p_tenant_id, 0, 'Wallet', now())
  ON CONFLICT (user_id, tenant_id) DO NOTHING;

  SELECT * INTO v_wallet
  FROM public.student_credits
  WHERE user_id = p_user_id
    AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'apply_invoice_wallet_credit_wallet_missing' USING ERRCODE = 'P0002';
  END IF;

  v_before := coalesce(v_wallet.balance_rappen, 0);
  v_after := v_before + v_amount;

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
      created_by,
      notes,
      status,
      created_at
    ) VALUES (
      p_user_id,
      p_tenant_id,
      'deposit',
      v_amount,
      v_before,
      v_after,
      'invoice',
      p_invoice_id,
      'invoice',
      p_actor_user_id,
      'Guthaben aus Rechnung ' || v_invoice_number,
      'completed',
      now()
    )
    RETURNING id INTO v_ledger_id;
  EXCEPTION
    WHEN unique_violation THEN
      -- Concurrent inserter won. Re-read and verify before claiming success.
      SELECT * INTO v_existing
      FROM public.credit_transactions
      WHERE tenant_id = p_tenant_id
        AND reference_id = p_invoice_id
        AND reference_type = 'invoice'
        AND transaction_type IN ('deposit', 'credit_product_purchase')
        AND status = 'completed'
      ORDER BY created_at ASC
      LIMIT 1;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'apply_invoice_wallet_credit_unique_without_row' USING ERRCODE = 'P0001';
      END IF;

      IF v_existing.tenant_id IS DISTINCT FROM p_tenant_id
         OR v_existing.user_id IS DISTINCT FROM p_user_id
         OR v_existing.reference_id IS DISTINCT FROM p_invoice_id
         OR coalesce(v_existing.amount_rappen, 0) <> v_amount THEN
        RAISE EXCEPTION 'apply_invoice_wallet_credit_ledger_mismatch' USING ERRCODE = 'P0001';
      END IF;

      UPDATE public.invoices
      SET
        credit_applied_rappen = v_amount,
        credit_applied_at = coalesce(credit_applied_at, now()),
        updated_at = now()
      WHERE id = p_invoice_id
        AND tenant_id = p_tenant_id
        AND coalesce(credit_applied_rappen, 0) = 0;

      RETURN jsonb_build_object(
        'ok', true,
        'outcome', 'already_applied',
        'applied_rappen', 0,
        'skipped', true,
        'credit_applied_rappen', v_amount,
        'ledger_id', v_existing.id
      );
  END;

  -- Atomic increment under the wallet row lock (prevents lost updates across
  -- distinct invoice credits that serialize on the same student_credits row).
  UPDATE public.student_credits
  SET
    balance_rappen = balance_rappen + v_amount,
    notes = 'Guthaben aus Rechnung ' || v_invoice_number,
    updated_at = now()
  WHERE id = v_wallet.id
    AND tenant_id = p_tenant_id
    AND user_id = p_user_id
    AND coalesce(balance_rappen, 0) = v_before;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'apply_invoice_wallet_credit_balance_race' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.invoices
  SET
    credit_applied_rappen = v_amount,
    credit_applied_at = now(),
    updated_at = now()
  WHERE id = p_invoice_id
    AND tenant_id = p_tenant_id
    AND coalesce(credit_applied_rappen, 0) = 0;

  RETURN jsonb_build_object(
    'ok', true,
    'outcome', 'applied',
    'applied_rappen', v_amount,
    'skipped', false,
    'balance_before_rappen', v_before,
    'balance_after_rappen', v_after,
    'ledger_id', v_ledger_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_invoice_wallet_credit(uuid, uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_invoice_wallet_credit(uuid, uuid, uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_invoice_wallet_credit(uuid, uuid, uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.apply_invoice_wallet_credit(uuid, uuid, uuid, uuid) IS
  'Atomically applies invoice wallet credit: locks invoice+wallet, inserts idempotent ledger deposit, increments balance, stamps credit_applied_rappen.';
