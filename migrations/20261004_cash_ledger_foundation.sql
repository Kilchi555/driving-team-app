-- Cash ledger foundation. Additive only.
-- Do not apply this file to production from the app deploy.
-- Do not call apply_legacy_cash_attribution() against production from this change.
--
-- Read-only check before writing this file (Driving Team App, 2026-10-04):
--   completed cash payments with an appointment: classified by the rules below
--   legacy_no_switch = 204
--   legacy_wallee = 136
--   legacy_invoice = 5
--   legacy total = 345
--   ambiguous = 6
--   original method already completed = 0
--   The figure 351 is the older population (cash + completed + appointment + staff).
--   It is not the legacy population.
--
-- legacy_service_staff does NOT mean the appointment staff took the cash.
-- cashier_staff_id stays NULL. service_staff_id is the lesson staff, kept only
-- as a historical proxy because the cashier cannot be reconstructed.
-- A row that already has cashier_staff_id or attribution is never overwritten.
--
-- New trigger rows are attribution = 'unknown', not 'cashier_staff' and not
-- 'legacy_service_staff'. unknown stops a later backfill from treating a
-- future cash payment as a historical proxy. instructor_id is unchanged and
-- is still not a cashier.
--
-- Attribution NULL remains valid only for rows that are not new appointment
-- cash: historical rows before an explicit backfill, product-sale cash, and
-- credit-deposit cash. Those last two have no appointment, so the legacy
-- classifier cannot see them. A new row with an appointment must not stay
-- attribution NULL, or a later backfill could treat it as legacy_service_staff.
--
-- authenticated keeps the existing row policy for ordinary cash fields.
-- Table-level INSERT/UPDATE is replaced with column grants that omit
-- cashier_staff_id, service_staff_id, and attribution. No client parameter
-- can assign a cashier or a legacy proxy.

ALTER TABLE public.cash_transactions
  ADD COLUMN IF NOT EXISTS cashier_staff_id uuid,
  ADD COLUMN IF NOT EXISTS service_staff_id uuid,
  ADD COLUMN IF NOT EXISTS attribution text;

DO $fk$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cash_transactions_cashier_staff_id_fkey'
      AND conrelid = 'public.cash_transactions'::regclass
  ) THEN
    ALTER TABLE public.cash_transactions
      ADD CONSTRAINT cash_transactions_cashier_staff_id_fkey
      FOREIGN KEY (cashier_staff_id) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cash_transactions_service_staff_id_fkey'
      AND conrelid = 'public.cash_transactions'::regclass
  ) THEN
    ALTER TABLE public.cash_transactions
      ADD CONSTRAINT cash_transactions_service_staff_id_fkey
      FOREIGN KEY (service_staff_id) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END
$fk$;

ALTER TABLE public.cash_transactions
  DROP CONSTRAINT IF EXISTS cash_transactions_attribution_check;
ALTER TABLE public.cash_transactions
  ADD CONSTRAINT cash_transactions_attribution_check
  CHECK (
    attribution IS NULL
    OR attribution IN ('cashier_staff', 'legacy_service_staff', 'unknown')
  );

-- A historical proxy must not also claim a proven cashier.
ALTER TABLE public.cash_transactions
  DROP CONSTRAINT IF EXISTS cash_transactions_legacy_cashier_null_check;
ALTER TABLE public.cash_transactions
  ADD CONSTRAINT cash_transactions_legacy_cashier_null_check
  CHECK (
    attribution IS DISTINCT FROM 'legacy_service_staff'
    OR cashier_staff_id IS NULL
  );

-- cashier_staff is only valid once the person who took the cash is stored.
ALTER TABLE public.cash_transactions
  DROP CONSTRAINT IF EXISTS cash_transactions_cashier_staff_requires_id_check;
ALTER TABLE public.cash_transactions
  ADD CONSTRAINT cash_transactions_cashier_staff_requires_id_check
  CHECK (
    attribution IS DISTINCT FROM 'cashier_staff'
    OR cashier_staff_id IS NOT NULL
  );

CREATE INDEX IF NOT EXISTS idx_cash_transactions_tenant_attribution
  ON public.cash_transactions (tenant_id, attribution);

CREATE INDEX IF NOT EXISTS idx_cash_transactions_tenant_service_staff
  ON public.cash_transactions (tenant_id, service_staff_id);

CREATE INDEX IF NOT EXISTS idx_cash_transactions_tenant_cashier_staff
  ON public.cash_transactions (tenant_id, cashier_staff_id)
  WHERE cashier_staff_id IS NOT NULL;

COMMENT ON COLUMN public.cash_transactions.cashier_staff_id IS
  'Person who actually took the cash. NULL for legacy_service_staff: that attribution is not a proven cashier.';
COMMENT ON COLUMN public.cash_transactions.service_staff_id IS
  'Person who delivered the lesson or service. Not the cashier.';
COMMENT ON COLUMN public.cash_transactions.attribution IS
  'cashier_staff = proven cashier. legacy_service_staff = historical proxy via service_staff_id, cashier unknown. unknown = not yet attributed. NULL = not classified.';

-- Classifies completed appointment cash payments inside one tenant.
-- Does not write. A null tenant argument returns no rows.
CREATE OR REPLACE FUNCTION public.cash_ledger_classify_payments(p_tenant_id uuid)
RETURNS TABLE (
  payment_id uuid,
  cash_transaction_id uuid,
  appointment_id uuid,
  service_staff_id uuid,
  tenant_id uuid,
  amount_rappen integer,
  bucket text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $fn$
  WITH pay AS (
    SELECT
      p.id,
      p.tenant_id,
      p.appointment_id,
      p.staff_id,
      p.total_amount_rappen AS total,
      p.amount_paid_rappen AS paid,
      COALESCE(p.credit_used_rappen, 0) AS credit,
      COALESCE(p.refunded_amount_rappen, 0) AS refunded,
      a.staff_id AS appt_staff,
      a.tenant_id AS appt_tenant,
      COALESCE(jsonb_array_length(p.metadata -> 'partial_payments'), 0) AS partial_n,
      COALESCE((
        SELECT sum((e ->> 'amount_rappen')::integer)
        FROM jsonb_array_elements(COALESCE(p.metadata -> 'partial_payments', '[]'::jsonb)) e
      ), 0) AS partial_sum,
      (
        SELECT count(*)
        FROM public.cash_transactions ct
        WHERE ct.appointment_id = p.appointment_id
          AND ct.status IS DISTINCT FROM 'disputed'
      ) AS ct_n,
      (
        SELECT COALESCE(sum(ct.amount_rappen), 0)
        FROM public.cash_transactions ct
        WHERE ct.appointment_id = p.appointment_id
          AND ct.status IS DISTINCT FROM 'disputed'
      ) AS ct_sum,
      (
        SELECT ct.id
        FROM public.cash_transactions ct
        WHERE ct.appointment_id = p.appointment_id
          AND ct.status IS DISTINCT FROM 'disputed'
        ORDER BY ct.id
        LIMIT 1
      ) AS ct_id,
      (
        SELECT bool_or(ct.tenant_id IS NOT NULL AND ct.tenant_id IS DISTINCT FROM p.tenant_id)
        FROM public.cash_transactions ct
        WHERE ct.appointment_id = p.appointment_id
          AND ct.status IS DISTINCT FROM 'disputed'
      ) AS foreign_ct
    FROM public.payments p
    LEFT JOIN public.appointments a ON a.id = p.appointment_id
    WHERE p_tenant_id IS NOT NULL
      AND p.tenant_id = p_tenant_id
      AND p.payment_method = 'cash'
      AND p.payment_status = 'completed'
      AND p.appointment_id IS NOT NULL
  ),
  sw AS (
    SELECT DISTINCT ON (l.payment_id)
      l.payment_id,
      l.old_payment_method AS src,
      l.created_at AS switch_at
    FROM public.payment_audit_logs l
    WHERE l.old_payment_method IS NOT NULL
      AND l.new_payment_method = 'cash'
      AND l.old_payment_method IS DISTINCT FROM 'cash'
    ORDER BY l.payment_id, l.created_at
  ),
  facts AS (
    SELECT
      pay.*,
      sw.src,
      EXISTS (
        SELECT 1
        FROM public.payment_audit_logs e
        WHERE e.payment_id = pay.id
          AND sw.switch_at IS NOT NULL
          AND e.created_at < sw.switch_at
          AND e.new_payment_status IN ('completed', 'paid')
      ) AS completed_before,
      EXISTS (
        SELECT 1
        FROM public.payment_refunds r
        WHERE r.payment_id = pay.id
          AND r.status = 'successful'
      ) AS refund_row
    FROM pay
    LEFT JOIN sw ON sw.payment_id = pay.id
  )
  SELECT
    facts.id,
    CASE WHEN facts.ct_n = 1 THEN facts.ct_id ELSE NULL END,
    facts.appointment_id,
    facts.appt_staff,
    facts.tenant_id,
    facts.total,
    CASE
      WHEN facts.foreign_ct
        OR facts.staff_id IS NULL
        OR facts.appt_staff IS NULL
        OR facts.staff_id IS DISTINCT FROM facts.appt_staff
        OR facts.tenant_id IS NULL
        OR facts.appt_tenant IS DISTINCT FROM facts.tenant_id
      THEN 'identity'
      WHEN facts.refunded > 0 OR facts.refund_row THEN 'refund'
      WHEN facts.completed_before THEN 'original_completed'
      WHEN NOT (
        facts.credit = 0
        AND facts.refunded = 0
        AND facts.ct_n = 1
        AND facts.ct_sum = facts.total
        AND (facts.partial_n = 0 OR facts.partial_sum = facts.total)
        AND (facts.paid IS NULL OR facts.paid = facts.total)
      ) THEN 'ambiguous'
      WHEN facts.src IS NULL THEN 'legacy_no_switch'
      WHEN facts.src = 'wallee' THEN 'legacy_wallee'
      WHEN facts.src = 'invoice' THEN 'legacy_invoice'
      ELSE 'legacy_other_switch'
    END
  FROM facts
$fn$;

COMMENT ON FUNCTION public.cash_ledger_classify_payments(uuid) IS
  'Read-only tenant-scoped classification of completed appointment cash payments. legacy_* means service_staff proxy, not a proven cashier. A started Wallee checkout is not an original completed payment.';

CREATE OR REPLACE FUNCTION public.cash_ledger_legacy_candidates(p_tenant_id uuid)
RETURNS TABLE (
  payment_id uuid,
  cash_transaction_id uuid,
  appointment_id uuid,
  service_staff_id uuid,
  tenant_id uuid,
  amount_rappen integer,
  bucket text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $fn$
  SELECT *
  FROM public.cash_ledger_classify_payments(p_tenant_id) c
  WHERE c.bucket IN (
    'legacy_no_switch',
    'legacy_wallee',
    'legacy_invoice',
    'legacy_other_switch'
  )
    AND c.cash_transaction_id IS NOT NULL
    AND c.service_staff_id IS NOT NULL
    AND c.tenant_id = p_tenant_id
$fn$;

COMMENT ON FUNCTION public.cash_ledger_legacy_candidates(uuid) IS
  'Legacy proxy candidates for one tenant. Does not write. Does not set a cashier.';

-- Idempotent: a second call updates nothing because attribution is no longer NULL.
-- Never writes cashier_staff_id. Never updates payments, refunds, movements, or balances.
CREATE OR REPLACE FUNCTION public.apply_legacy_cash_attribution(p_tenant_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $fn$
DECLARE
  v_count integer;
BEGIN
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_required' USING ERRCODE = '22023';
  END IF;

  UPDATE public.cash_transactions ct
  SET
    service_staff_id = c.service_staff_id,
    attribution = 'legacy_service_staff',
    tenant_id = c.tenant_id
  FROM public.cash_ledger_legacy_candidates(p_tenant_id) c
  WHERE ct.id = c.cash_transaction_id
    AND ct.cashier_staff_id IS NULL
    AND ct.attribution IS NULL
    AND (ct.tenant_id IS NULL OR ct.tenant_id = p_tenant_id)
    AND c.tenant_id = p_tenant_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$fn$;

COMMENT ON FUNCTION public.apply_legacy_cash_attribution(uuid) IS
  'Sets service_staff_id, attribution = legacy_service_staff, and tenant_id. Leaves cashier_staff_id NULL. Skips rows that already have a cashier or an attribution. Not run by this migration.';

REVOKE ALL ON FUNCTION public.cash_ledger_classify_payments(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cash_ledger_classify_payments(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.cash_ledger_classify_payments(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cash_ledger_classify_payments(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.cash_ledger_legacy_candidates(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cash_ledger_legacy_candidates(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.cash_ledger_legacy_candidates(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cash_ledger_legacy_candidates(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.apply_legacy_cash_attribution(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_legacy_cash_attribution(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.apply_legacy_cash_attribution(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_legacy_cash_attribution(uuid) TO service_role;

-- Future appointment cash rows record the lesson staff and an unknown
-- attribution. They do not invent a cashier from appointments.staff_id.
CREATE OR REPLACE FUNCTION public.create_cash_transaction_from_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $function$
DECLARE
  v_appointment_data RECORD;
  v_instructor_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Produkt-Barverkauf ohne Termin erzeugt die Kassenzeile später selbst.
  IF NEW.appointment_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.payment_method = 'cash' AND NEW.payment_status = 'completed' THEN
    SELECT
      user_id AS student_id,
      staff_id AS instructor_id,
      tenant_id AS appointment_tenant_id,
      id AS appointment_id
    INTO v_appointment_data
    FROM appointments
    WHERE id = NEW.appointment_id;

    -- instructor_id stays the existing column. auth.uid() is only the old
    -- fallback when the appointment has no staff. It is not the cashier.
    IF v_appointment_data.instructor_id IS NULL THEN
      v_instructor_id := auth.uid();
    ELSE
      v_instructor_id := v_appointment_data.instructor_id;
    END IF;

    -- Copy the payment tenant only when the appointment agrees. Do not infer.
    IF NEW.tenant_id IS NOT NULL
      AND NEW.tenant_id IS NOT DISTINCT FROM v_appointment_data.appointment_tenant_id
    THEN
      v_tenant_id := NEW.tenant_id;
    ELSE
      v_tenant_id := NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM cash_transactions
      WHERE appointment_id = NEW.appointment_id
        AND status != 'disputed'
    ) THEN
      INSERT INTO cash_transactions (
        instructor_id,
        student_id,
        appointment_id,
        amount_rappen,
        notes,
        status,
        tenant_id,
        service_staff_id,
        cashier_staff_id,
        attribution
      ) VALUES (
        v_instructor_id,
        v_appointment_data.student_id,
        v_appointment_data.appointment_id,
        NEW.total_amount_rappen,
        CONCAT('Automatisch erstellt aus Payment ID: ', NEW.id),
        'pending',
        v_tenant_id,
        v_appointment_data.instructor_id,
        NULL,
        'unknown'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.create_cash_transaction_from_payment() IS
  'Creates a pending cash_transaction for a completed appointment cash payment. service_staff_id is the lesson staff. cashier_staff_id stays NULL. attribution is unknown, never cashier_staff and never legacy_service_staff.';

-- Appointment-linked manual cash. Same contract as the payment trigger.
-- The caller is stored in instructor_id exactly as before. That is not a cashier.
-- Signature stays the five existing arguments. No attribution parameter.
CREATE OR REPLACE FUNCTION public.create_cash_transaction(
  p_instructor_id uuid,
  p_student_id uuid,
  p_appointment_id uuid,
  p_amount_rappen integer,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $fn$
DECLARE
  v_transaction_id uuid;
  v_service_staff_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_instructor_id AND role IN ('instructor', 'admin')
  ) THEN
    RAISE EXCEPTION 'Nur Fahrlehrer können Bargeldtransaktionen erstellen';
  END IF;

  SELECT a.staff_id
  INTO v_service_staff_id
  FROM public.appointments a
  WHERE a.id = p_appointment_id
    AND a.user_id = p_student_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Termin nicht gefunden';
  END IF;

  INSERT INTO public.cash_transactions (
    instructor_id,
    student_id,
    appointment_id,
    amount_rappen,
    notes,
    service_staff_id,
    cashier_staff_id,
    attribution
  ) VALUES (
    p_instructor_id,
    p_student_id,
    p_appointment_id,
    p_amount_rappen,
    p_notes,
    v_service_staff_id,
    NULL,
    'unknown'
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$fn$;

COMMENT ON FUNCTION public.create_cash_transaction(uuid, uuid, uuid, integer, text) IS
  'Manual appointment cash row. service_staff_id is the lesson staff. cashier_staff_id stays NULL. attribution is unknown. The caller is not recorded as the cashier.';

REVOKE ALL ON FUNCTION public.create_cash_transaction(uuid, uuid, uuid, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_cash_transaction(uuid, uuid, uuid, integer, text) FROM anon;
REVOKE ALL ON FUNCTION public.create_cash_transaction(uuid, uuid, uuid, integer, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_cash_transaction(uuid, uuid, uuid, integer, text) TO service_role;

-- Closes the NULL-attribution hole for every insert, including writers that
-- do not mention the new columns. Does not update existing rows.
-- legacy_service_staff is refused on insert. The backfill is an update.
--
-- Insert does not look at auth.role(). The payment trigger is SECURITY DEFINER
-- and may run while the JWT role is still authenticated. Column grants, not
-- this insert branch, stop a client from naming the attribution columns.
-- The update branch still refuses an authenticated change to those columns.
CREATE OR REPLACE FUNCTION public.cash_transactions_protect_attribution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.attribution = 'legacy_service_staff' THEN
      RAISE EXCEPTION 'legacy_attribution_insert_forbidden' USING ERRCODE = '42501';
    END IF;

    IF NEW.appointment_id IS NOT NULL AND NEW.attribution IS NULL THEN
      NEW.attribution := 'unknown';
    END IF;

    RETURN NEW;
  END IF;

  IF coalesce(auth.role(), '') IN ('authenticated', 'anon') THEN
    IF NEW.cashier_staff_id IS DISTINCT FROM OLD.cashier_staff_id
      OR NEW.service_staff_id IS DISTINCT FROM OLD.service_staff_id
      OR NEW.attribution IS DISTINCT FROM OLD.attribution
    THEN
      RAISE EXCEPTION 'attribution_not_client_writable' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION public.cash_transactions_protect_attribution() IS
  'A new appointment row with no attribution becomes unknown. Insert of legacy_service_staff is refused. Authenticated updates cannot change cashier, service staff, or attribution. Existing NULL rows are not rewritten by this trigger.';

DROP TRIGGER IF EXISTS cash_transactions_protect_attribution ON public.cash_transactions;
CREATE TRIGGER cash_transactions_protect_attribution
  BEFORE INSERT OR UPDATE ON public.cash_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.cash_transactions_protect_attribution();

-- EXECUTE is required for a role whose statement fires the trigger.
-- The function returns trigger and does not assign a cashier.
REVOKE ALL ON FUNCTION public.cash_transactions_protect_attribution() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cash_transactions_protect_attribution() FROM anon;
GRANT EXECUTE ON FUNCTION public.cash_transactions_protect_attribution() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cash_transactions_protect_attribution() TO service_role;

-- Table-level INSERT/UPDATE would include the new columns automatically.
-- Replace them with the columns staff cash already uses. SELECT and DELETE
-- stay as they are. The row policy cash_transactions_write_own_or_admin stays.
REVOKE INSERT, UPDATE ON TABLE public.cash_transactions FROM PUBLIC;
REVOKE INSERT, UPDATE ON TABLE public.cash_transactions FROM anon;
REVOKE INSERT, UPDATE ON TABLE public.cash_transactions FROM authenticated;

GRANT INSERT (
  id,
  instructor_id,
  student_id,
  appointment_id,
  amount_rappen,
  collected_at,
  confirmed_by,
  confirmed_at,
  status,
  notes,
  created_at,
  updated_at,
  tenant_id,
  office_cash_register_id,
  transaction_source
), UPDATE (
  instructor_id,
  student_id,
  appointment_id,
  amount_rappen,
  collected_at,
  confirmed_by,
  confirmed_at,
  status,
  notes,
  updated_at,
  tenant_id,
  office_cash_register_id,
  transaction_source
) ON TABLE public.cash_transactions TO authenticated;
