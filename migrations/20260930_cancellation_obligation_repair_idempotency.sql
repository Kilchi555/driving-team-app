-- Cancellation-charge repair idempotency.
--
-- DRAFT. Do not apply until the concurrency review of this migration is accepted.
-- Does not alter the manual credit top-up function or its unique index.
--
-- One logical repair is the wallet correction for one appointment, one tenant,
-- one direction (waive or reinstate), and one observed set of eligible ledger
-- rows. That set is hashed to obligation_repair_basis_id. A concurrent retry
-- observes the same set and collides. A later legitimate change observes the
-- newly posted row, so its basis differs and is allowed.
--
-- Historical ledger rows keep a NULL basis and are outside the partial index.
-- PostgreSQL treats NULL as distinct in unique indexes, so the index predicate
-- excludes NULL explicitly. The empty snapshot uses the all-zero sentinel,
-- never NULL.
--
-- Rollback, only after confirming no repair written by this function must be kept:
-- remove function public.apply_cancellation_obligation_repair(uuid, uuid, uuid, integer, text, uuid, text, text, text, uuid)
-- remove function public.cancellation_obligation_repair_basis(uuid, uuid, uuid)
-- remove index public.credit_tx_obligation_repair_basis_uidx
-- remove column public.credit_transactions.obligation_repair_basis_id

ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS obligation_repair_basis_id uuid;

COMMENT ON COLUMN public.credit_transactions.obligation_repair_basis_id IS
  'Hash of the eligible appointment ledger ids this waiver or reinstate corrected. Sentinel zero UUID means the snapshot was empty. NULL on historical rows.';

CREATE UNIQUE INDEX IF NOT EXISTS credit_tx_obligation_repair_basis_uidx
  ON public.credit_transactions (tenant_id, reference_id, transaction_type, obligation_repair_basis_id)
  WHERE reference_type = 'appointment'
    AND transaction_type IN ('cancellation_charge_waiver', 'cancellation_charge_reinstate')
    AND obligation_repair_basis_id IS NOT NULL
    AND reference_id IS NOT NULL
    AND tenant_id IS NOT NULL;

-- Eligible-row hash. Must match obligationRepairBasisId() in
-- server/utils/cancellation-payment-obligation.ts: md5 of the comma-joined
-- lowercase UUID texts, sorted lexicographically, formatted 8-4-4-4-12.
CREATE OR REPLACE FUNCTION public.cancellation_obligation_repair_basis(
  p_tenant_id uuid,
  p_user_id uuid,
  p_appointment_id uuid
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH ids AS (
    SELECT ct.id::text AS id_text
    FROM public.credit_transactions ct
    WHERE ct.tenant_id = p_tenant_id
      AND ct.user_id = p_user_id
      AND ct.reference_id = p_appointment_id
      AND ct.reference_type = 'appointment'
      AND ct.transaction_type IN (
        'cancellation',
        'cancellation_credit_refund',
        'cancellation_charge_waiver',
        'cancellation_charge_reinstate',
        'refund'
      )
      AND ct.payment_method IS DISTINCT FROM 'wallee_refund'
      AND (
        ct.balance_before_rappen IS NOT NULL
        OR ct.balance_after_rappen IS NOT NULL
      )
  ),
  payload AS (
    SELECT string_agg(id_text, ',' ORDER BY id_text) AS joined
    FROM ids
  )
  SELECT CASE
    WHEN joined IS NULL THEN '00000000-0000-0000-0000-000000000000'::uuid
    ELSE (
      substr(md5(joined), 1, 8) || '-' ||
      substr(md5(joined), 9, 4) || '-' ||
      substr(md5(joined), 13, 4) || '-' ||
      substr(md5(joined), 17, 4) || '-' ||
      substr(md5(joined), 21, 12)
    )::uuid
  END
  FROM payload;
$$;

CREATE OR REPLACE FUNCTION public.apply_cancellation_obligation_repair(
  p_appointment_id uuid,
  p_user_id uuid,
  p_tenant_id uuid,
  p_delta_rappen integer,
  p_transaction_type text,
  p_expected_basis_id uuid,
  p_note text,
  p_description text,
  p_payment_method text,
  p_created_by uuid
)
RETURNS TABLE (
  applied boolean,
  already_applied boolean,
  stale boolean,
  amount_rappen integer,
  balance_rappen integer,
  transaction_id uuid,
  basis_after uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_basis uuid;
  v_inserted_id uuid;
  v_existing_id uuid;
  v_existing_amount integer;
  v_balance integer;
  v_before integer;
BEGIN
  IF p_appointment_id IS NULL OR p_user_id IS NULL OR p_tenant_id IS NULL OR p_expected_basis_id IS NULL THEN
    RAISE EXCEPTION 'invalid_repair_request' USING ERRCODE = '22023';
  END IF;

  IF p_transaction_type NOT IN ('cancellation_charge_waiver', 'cancellation_charge_reinstate') THEN
    RAISE EXCEPTION 'invalid_repair_type' USING ERRCODE = '22023';
  END IF;

  IF p_delta_rappen IS NULL OR p_delta_rappen = 0 THEN
    RAISE EXCEPTION 'invalid_repair_delta' USING ERRCODE = '22023';
  END IF;

  IF p_transaction_type = 'cancellation_charge_waiver' AND p_delta_rappen < 0 THEN
    RAISE EXCEPTION 'invalid_repair_delta' USING ERRCODE = '22023';
  END IF;

  IF p_transaction_type = 'cancellation_charge_reinstate' AND p_delta_rappen > 0 THEN
    RAISE EXCEPTION 'invalid_repair_delta' USING ERRCODE = '22023';
  END IF;

  IF p_note IS NULL OR length(trim(p_note)) < 3 OR length(p_note) > 2000 THEN
    RAISE EXCEPTION 'invalid_repair_note' USING ERRCODE = '22023';
  END IF;

  IF p_payment_method IS NULL OR p_payment_method NOT IN ('refund', 'adjustment') THEN
    RAISE EXCEPTION 'invalid_repair_method' USING ERRCODE = '22023';
  END IF;

  PERFORM 1
  FROM public.appointments a
  WHERE a.id = p_appointment_id
    AND a.tenant_id = p_tenant_id
    AND a.user_id = p_user_id
    AND a.status = 'cancelled'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'appointment_mismatch' USING ERRCODE = '42501';
  END IF;

  v_current_basis := public.cancellation_obligation_repair_basis(
    p_tenant_id,
    p_user_id,
    p_appointment_id
  );

  IF v_current_basis IS DISTINCT FROM p_expected_basis_id THEN
    SELECT sc.balance_rappen
      INTO v_balance
    FROM public.student_credits sc
    WHERE sc.user_id = p_user_id
      AND sc.tenant_id = p_tenant_id;

    applied := false;
    already_applied := false;
    stale := true;
    amount_rappen := 0;
    balance_rappen := v_balance;
    transaction_id := NULL;
    basis_after := v_current_basis;
    RETURN NEXT;
    RETURN;
  END IF;

  -- balance_before_rappen and balance_after_rappen are NOT NULL and have no
  -- default. Claim the row first, then stamp the post-increment balances below.
  -- Both writes commit or roll back together.
  INSERT INTO public.credit_transactions (
    user_id,
    tenant_id,
    transaction_type,
    amount_rappen,
    payment_method,
    reference_id,
    reference_type,
    notes,
    description,
    created_by,
    status,
    obligation_repair_basis_id,
    balance_before_rappen,
    balance_after_rappen
  ) VALUES (
    p_user_id,
    p_tenant_id,
    p_transaction_type,
    p_delta_rappen,
    p_payment_method,
    p_appointment_id,
    'appointment',
    trim(p_note),
    COALESCE(NULLIF(trim(COALESCE(p_description, '')), ''), trim(p_note)),
    p_created_by,
    'completed',
    p_expected_basis_id,
    0,
    0
  )
  ON CONFLICT (tenant_id, reference_id, transaction_type, obligation_repair_basis_id)
    WHERE reference_type = 'appointment'
      AND transaction_type IN ('cancellation_charge_waiver', 'cancellation_charge_reinstate')
      AND obligation_repair_basis_id IS NOT NULL
      AND reference_id IS NOT NULL
      AND tenant_id IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NULL THEN
    SELECT ct.id, ct.amount_rappen
      INTO v_existing_id, v_existing_amount
    FROM public.credit_transactions ct
    WHERE ct.tenant_id = p_tenant_id
      AND ct.reference_id = p_appointment_id
      AND ct.reference_type = 'appointment'
      AND ct.transaction_type = p_transaction_type
      AND ct.obligation_repair_basis_id = p_expected_basis_id
    LIMIT 1;

    SELECT sc.balance_rappen
      INTO v_balance
    FROM public.student_credits sc
    WHERE sc.user_id = p_user_id
      AND sc.tenant_id = p_tenant_id;

    applied := false;
    already_applied := true;
    stale := false;
    amount_rappen := COALESCE(v_existing_amount, 0);
    balance_rappen := v_balance;
    transaction_id := v_existing_id;
    basis_after := v_current_basis;
    RETURN NEXT;
    RETURN;
  END IF;

  -- increment_balance returns TABLE(balance_rappen, pending_withdrawal_rappen).
  -- Take balance_rappen from that row. The function already updated the wallet.
  -- pending_withdrawal_rappen is unchanged for an existing wallet and is not
  -- written again here.
  SELECT ib.balance_rappen
    INTO v_balance
  FROM public.increment_balance(p_user_id, p_tenant_id, p_delta_rappen) AS ib;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'wallet_increment_failed' USING ERRCODE = 'P0001';
  END IF;

  v_before := v_balance - p_delta_rappen;

  UPDATE public.credit_transactions
  SET balance_before_rappen = v_before,
      balance_after_rappen = v_balance
  WHERE id = v_inserted_id
    AND tenant_id = p_tenant_id
    AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'repair_balance_stamp_failed' USING ERRCODE = 'P0001';
  END IF;

  applied := true;
  already_applied := false;
  stale := false;
  amount_rappen := p_delta_rappen;
  balance_rappen := v_balance;
  transaction_id := v_inserted_id;
  basis_after := public.cancellation_obligation_repair_basis(
    p_tenant_id,
    p_user_id,
    p_appointment_id
  );
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.cancellation_obligation_repair_basis(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_cancellation_obligation_repair(
  uuid, uuid, uuid, integer, text, uuid, text, text, text, uuid
) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.cancellation_obligation_repair_basis(uuid, uuid, uuid) FROM anon;
    REVOKE ALL ON FUNCTION public.apply_cancellation_obligation_repair(
      uuid, uuid, uuid, integer, text, uuid, text, text, text, uuid
    ) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.cancellation_obligation_repair_basis(uuid, uuid, uuid) FROM authenticated;
    REVOKE ALL ON FUNCTION public.apply_cancellation_obligation_repair(
      uuid, uuid, uuid, integer, text, uuid, text, text, text, uuid
    ) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.cancellation_obligation_repair_basis(uuid, uuid, uuid) TO service_role;
    GRANT EXECUTE ON FUNCTION public.apply_cancellation_obligation_repair(
      uuid, uuid, uuid, integer, text, uuid, text, text, text, uuid
    ) TO service_role;
  END IF;
END;
$$;
