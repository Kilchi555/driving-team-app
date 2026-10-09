-- P2: Backfill unambiguous NULL-tenant appointment children
--
-- CONTEXT:
--   Legacy cash_transactions / discount_sales rows exist with tenant_id IS NULL
--   but appointment_id pointing at live appointments that have a non-null
--   tenant_id. Those rows block hard-delete via ON DELETE NO ACTION FKs into
--   appointments because the RPC tenant_id-scoped clears miss them.
--
-- OWNERSHIP RULE (authoritative — do not replace with heuristics):
--   child.tenant_id := appointments.tenant_id
--   ONLY when:
--     child.tenant_id IS NULL
--     AND child.appointment_id IS NOT NULL
--     AND appointment exists
--     AND appointment.tenant_id IS NOT NULL
--
-- NEVER infer ownership from user_id, staff_id, payment metadata, amounts,
-- or timestamps.
--
-- SAFETY:
--   - Fail (raise) if any candidate lacks an unambiguous appointment tenant.
--   - Idempotent: re-run finds zero candidates and succeeds.
--   - Does NOT change FK ON DELETE behavior.
--   - Does NOT apply itself to production; human-gated apply only.
--
-- Discovery snapshot (prod unyjaetebnaexaflpyoc, read-only, 2026-10-09):
--   31 cash_transactions + 35 discount_sales = 66 SAFE rows.
--   Audit expectations below match that snapshot; the JOIN rule remains
--   authoritative if the live set differs.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Preflight: every NULL-tenant + appointment_id candidate must resolve to
--    exactly one non-null appointment.tenant_id. Fail closed otherwise.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_bad_cash bigint;
  v_bad_discount bigint;
BEGIN
  SELECT count(*) INTO v_bad_cash
  FROM public.cash_transactions ct
  WHERE ct.tenant_id IS NULL
    AND ct.appointment_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.appointments a
      WHERE a.id = ct.appointment_id
        AND a.tenant_id IS NOT NULL
    );

  IF v_bad_cash > 0 THEN
    RAISE EXCEPTION
      'backfill aborted: % cash_transactions rows have NULL tenant_id and appointment_id but no unambiguous appointment.tenant_id',
      v_bad_cash;
  END IF;

  SELECT count(*) INTO v_bad_discount
  FROM public.discount_sales ds
  WHERE ds.tenant_id IS NULL
    AND ds.appointment_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.appointments a
      WHERE a.id = ds.appointment_id
        AND a.tenant_id IS NOT NULL
    );

  IF v_bad_discount > 0 THEN
    RAISE EXCEPTION
      'backfill aborted: % discount_sales rows have NULL tenant_id and appointment_id but no unambiguous appointment.tenant_id',
      v_bad_discount;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Backfill cash_transactions (JOIN-only ownership)
-- ---------------------------------------------------------------------------
WITH updated AS (
  UPDATE public.cash_transactions ct
  SET tenant_id = a.tenant_id
  FROM public.appointments a
  WHERE ct.tenant_id IS NULL
    AND ct.appointment_id IS NOT NULL
    AND a.id = ct.appointment_id
    AND a.tenant_id IS NOT NULL
  RETURNING ct.id
)
SELECT count(*) AS cash_transactions_backfilled FROM updated;

-- ---------------------------------------------------------------------------
-- 3) Backfill discount_sales (JOIN-only ownership)
-- ---------------------------------------------------------------------------
WITH updated AS (
  UPDATE public.discount_sales ds
  SET tenant_id = a.tenant_id
  FROM public.appointments a
  WHERE ds.tenant_id IS NULL
    AND ds.appointment_id IS NOT NULL
    AND a.id = ds.appointment_id
    AND a.tenant_id IS NOT NULL
  RETURNING ds.id
)
SELECT count(*) AS discount_sales_backfilled FROM updated;

-- ---------------------------------------------------------------------------
-- 4) Postcondition: no SAFE-pattern leftovers may remain
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_left_cash bigint;
  v_left_discount bigint;
BEGIN
  SELECT count(*) INTO v_left_cash
  FROM public.cash_transactions ct
  JOIN public.appointments a ON a.id = ct.appointment_id
  WHERE ct.tenant_id IS NULL
    AND ct.appointment_id IS NOT NULL
    AND a.tenant_id IS NOT NULL;

  IF v_left_cash > 0 THEN
    RAISE EXCEPTION
      'backfill incomplete: % cash_transactions still NULL-tenant with resolvable appointment.tenant_id',
      v_left_cash;
  END IF;

  SELECT count(*) INTO v_left_discount
  FROM public.discount_sales ds
  JOIN public.appointments a ON a.id = ds.appointment_id
  WHERE ds.tenant_id IS NULL
    AND ds.appointment_id IS NOT NULL
    AND a.tenant_id IS NOT NULL;

  IF v_left_discount > 0 THEN
    RAISE EXCEPTION
      'backfill incomplete: % discount_sales still NULL-tenant with resolvable appointment.tenant_id',
      v_left_discount;
  END IF;
END $$;

COMMIT;
