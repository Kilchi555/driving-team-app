-- Atomic invoice → wallet credit:
--   lock invoice + wallet, insert idempotent ledger row, increment balance,
--   stamp invoices.credit_applied_rappen — all in ONE transaction.
--
-- Idempotent success requires mutual evidence:
--   marker (credit_applied_rappen) + matching completed ledger row
--   (tenant, user, invoice reference, amount). Ledger alone or marker alone
--   is NOT treated as success — fail closed for reconciliation.
--
-- NOT applied by this PR. Apply only via approved non-production then production rollout.
-- Does not rewrite historical rows. Unique index is IF NOT EXISTS (safe if already present
-- from 20261011_invoice_settlement_post_commit.sql).
--
-- READ-ONLY duplicate preflight (run manually on target DB before apply — do NOT run from CI
-- against Production without approval):
--   SELECT tenant_id, reference_id, count(*) AS cnt,
--          array_agg(id) AS ids, array_agg(amount_rappen) AS amounts
--   FROM public.credit_transactions
--   WHERE reference_type = 'invoice'
--     AND transaction_type IN ('deposit', 'credit_product_purchase')
--     AND status = 'completed'
--   GROUP BY tenant_id, reference_id
--   HAVING count(*) > 1;

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
  v_marker integer;
  v_ledger_amount integer;
  v_before integer;
  v_after integer;
  v_ledger_id uuid;
  v_invoice_number text;
  v_has_ledger boolean := false;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'apply_invoice_wallet_credit_service_role_only' USING ERRCODE = '42501';
  END IF;

  IF p_tenant_id IS NULL OR p_invoice_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'apply_invoice_wallet_credit_missing_args' USING ERRCODE = '22023';
  END IF;

  -- Serialize same-invoice credits first (lock order: invoice → wallet).
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

  -- Authoritative expected amount from invoice lines (never client-supplied).
  SELECT coalesce(sum(greatest(coalesce(credit_amount_rappen, 0), 0)), 0)::integer
    INTO v_amount
  FROM public.invoice_items
  WHERE invoice_id = p_invoice_id
    AND credit_to_wallet IS TRUE;

  v_marker := coalesce(v_invoice.credit_applied_rappen, 0);

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

  v_has_ledger := FOUND;

  IF v_has_ledger THEN
    IF v_existing.tenant_id IS DISTINCT FROM p_tenant_id
       OR v_existing.user_id IS DISTINCT FROM p_user_id
       OR v_existing.reference_id IS DISTINCT FROM p_invoice_id
       OR v_existing.reference_type IS DISTINCT FROM 'invoice'
       OR coalesce(v_existing.status, '') IS DISTINCT FROM 'completed'
       OR v_existing.transaction_type NOT IN ('deposit', 'credit_product_purchase') THEN
      RAISE EXCEPTION 'apply_invoice_wallet_credit_ledger_mismatch' USING ERRCODE = 'P0001';
    END IF;
    v_ledger_amount := coalesce(v_existing.amount_rappen, 0);
  END IF;

  -- ----- Idempotent / orphan classification (fail closed when incomplete) -----

  IF v_marker > 0 AND v_has_ledger THEN
    -- Marker + ledger must agree with each other. Expected line sum must agree
    -- when lines still declare a credit (>0); if lines were cleared (v_amount=0),
    -- marker↔ledger agreement alone is accepted as historical already_applied.
    IF v_ledger_amount <> v_marker THEN
      RAISE EXCEPTION 'apply_invoice_wallet_credit_reconciliation_required_marker_ledger_amount'
        USING ERRCODE = 'P0001';
    END IF;
    IF v_amount > 0 AND v_ledger_amount <> v_amount THEN
      RAISE EXCEPTION 'apply_invoice_wallet_credit_reconciliation_required_amount_mismatch'
        USING ERRCODE = 'P0001';
    END IF;
    -- Schema limitation: we cannot cryptographically prove the historical
    -- balance UPDATE succeeded; marker+matching ledger is the strongest
    -- mutual evidence this schema provides for a completed atomic apply.
    RETURN jsonb_build_object(
      'ok', true,
      'outcome', 'already_applied',
      'applied_rappen', 0,
      'skipped', true,
      'credit_applied_rappen', v_marker,
      'ledger_id', v_existing.id,
      'evidence', 'marker_and_ledger'
    );
  END IF;

  IF v_marker > 0 AND NOT v_has_ledger THEN
    RAISE EXCEPTION 'apply_invoice_wallet_credit_reconciliation_required_marker_without_ledger'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_marker = 0 AND v_has_ledger THEN
    -- Ledger without marker: do NOT stamp and do NOT re-credit. A ledger row
    -- alone does not prove the wallet balance was incremented (legacy RMW /
    -- partial writers). Requires separate reconciliation.
    IF v_amount > 0 AND v_ledger_amount <> v_amount THEN
      RAISE EXCEPTION 'apply_invoice_wallet_credit_reconciliation_required_amount_mismatch'
        USING ERRCODE = 'P0001';
    END IF;
    RAISE EXCEPTION 'apply_invoice_wallet_credit_reconciliation_required_ledger_without_marker'
      USING ERRCODE = 'P0001';
  END IF;

  -- No marker, no ledger: only safe to apply when expected credit > 0.
  -- Residual risk: undetectable balance-without-ledger orphans (state A) can
  -- still be double-credited — must be audited out-of-band before rollout.
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
      -- Another writer inserted a completed invoice-keyed row. Under this RPC's
      -- invoice lock, that writer did not complete the atomic stamp path with us.
      -- Do not treat as success; require reconciliation.
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

      RAISE EXCEPTION 'apply_invoice_wallet_credit_reconciliation_required_ledger_without_marker'
        USING ERRCODE = 'P0001';
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

  IF NOT FOUND THEN
    -- Marker changed under our lock (should be impossible); fail closed.
    RAISE EXCEPTION 'apply_invoice_wallet_credit_reconciliation_required_marker_race'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'outcome', 'applied',
    'applied_rappen', v_amount,
    'skipped', false,
    'balance_before_rappen', v_before,
    'balance_after_rappen', v_after,
    'ledger_id', v_ledger_id,
    'evidence', 'atomic_apply'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_invoice_wallet_credit(uuid, uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_invoice_wallet_credit(uuid, uuid, uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_invoice_wallet_credit(uuid, uuid, uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.apply_invoice_wallet_credit(uuid, uuid, uuid, uuid) IS
  'Atomically applies invoice wallet credit. Idempotent success requires matching credit_applied marker + ledger; orphan/mismatch states fail closed for reconciliation.';
