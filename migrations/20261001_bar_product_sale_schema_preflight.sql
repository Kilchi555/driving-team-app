-- DRAFT. Do not apply until explicitly approved.
-- Does not insert payments, cash rows, or credits.
-- Does not create a product-sale RPC.
-- Does not change book_payment_to_accounting or payments.payment_provider.
-- Does not use product_sales.
--
-- Live column is cash_transactions.transaction_source (not "source").
-- Checked on unyjaetebnaexaflpyoc before this draft:
--   credit_product_purchase rows = 0
--   payments with metadata.source = staff_product_sale = 0
--   transaction_source values in use: instructor (373), credit_deposit (9)
--
-- Replacing create_cash_transaction_from_payment() keeps the existing
-- trigger trigger_create_cash_transaction (AFTER INSERT OR UPDATE).
-- CREATE OR REPLACE keeps owner postgres, SECURITY DEFINER,
-- search_path = pg_catalog, public, and grants
-- (postgres EXECUTE, service_role EXECUTE).

CREATE OR REPLACE FUNCTION public.create_cash_transaction_from_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_appointment_data RECORD;
  v_instructor_id UUID;
BEGIN
  -- Produkt-Barverkauf ohne Termin erzeugt die Kassenzeile später selbst.
  -- Terminzahlungen laufen unverändert durch den bestehenden Zweig.
  IF NEW.appointment_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Nur ausführen wenn es eine Barzahlung ist UND der Schüler tatsächlich bezahlt hat
  IF NEW.payment_method = 'cash' AND NEW.payment_status = 'completed' THEN

    -- Hole Appointment-Daten um instructor_id zu bekommen
    SELECT
      user_id as student_id,
      staff_id as instructor_id,
      id as appointment_id
    INTO v_appointment_data
    FROM appointments
    WHERE id = NEW.appointment_id;

    -- Wenn kein staff_id gesetzt ist, verwende den current_user als instructor
    IF v_appointment_data.instructor_id IS NULL THEN
      v_instructor_id := auth.uid();
    ELSE
      v_instructor_id := v_appointment_data.instructor_id;
    END IF;

    -- Erstelle cash_transaction nur wenn noch nicht existiert
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
        status
      ) VALUES (
        v_instructor_id,
        v_appointment_data.student_id,
        v_appointment_data.appointment_id,
        NEW.total_amount_rappen,
        CONCAT('Automatisch erstellt aus Payment ID: ', NEW.id),
        'pending'
      );

      RAISE NOTICE 'Cash transaction created for payment %: %', NEW.id, NEW.total_amount_rappen;
    END IF;

  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.create_cash_transaction_from_payment() IS
  'Erstellt automatisch cash_transaction Einträge bei Barzahlungen mit Termin. Zahlungen ohne appointment_id werden übersprungen.';

-- Extend the identified check only. Stops if the allowed set is not exactly
-- the live trio, or already the trio plus product_sale.
DO $guard$
DECLARE
  def text;
  vals text[];
BEGIN
  SELECT pg_get_constraintdef(oid) INTO def
  FROM pg_constraint
  WHERE conname = 'cash_transactions_transaction_source_check'
    AND conrelid = 'public.cash_transactions'::regclass
    AND contype = 'c';

  IF def IS NULL THEN
    RAISE EXCEPTION 'cash_transactions_transaction_source_check not found';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT m[1] ORDER BY m[1]), '{}'::text[])
  INTO vals
  FROM regexp_matches(def, '''([^'']+)''', 'g') AS m;

  IF vals = ARRAY['credit_deposit', 'instructor', 'office', 'product_sale']::text[] THEN
    RAISE NOTICE 'cash_transactions_transaction_source_check already allows product_sale';
    RETURN;
  END IF;

  IF vals <> ARRAY['credit_deposit', 'instructor', 'office']::text[] THEN
    RAISE EXCEPTION 'unexpected cash_transactions_transaction_source_check values: %', vals;
  END IF;

  ALTER TABLE public.cash_transactions
    DROP CONSTRAINT cash_transactions_transaction_source_check;

  ALTER TABLE public.cash_transactions
    ADD CONSTRAINT cash_transactions_transaction_source_check
    CHECK (
      (transaction_source)::text = ANY (
        (ARRAY[
          'instructor'::character varying,
          'office'::character varying,
          'credit_deposit'::character varying,
          'product_sale'::character varying
        ])::text[]
      )
    );
END
$guard$;

-- One credit_product_purchase ledger row per payment.
-- NULL reference_id stays outside the index, matching the Wallee deposit index.
-- Does not cover deposit, manual_topup, or duration_reduction_credit.
CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_credit_product_purchase_payment_uidx
  ON public.credit_transactions (reference_id)
  WHERE reference_type = 'payment'
    AND transaction_type = 'credit_product_purchase'
    AND reference_id IS NOT NULL;

-- One staff product sale per tenant and idempotency key.
-- Other metadata sources, missing keys, and null tenants stay outside the index.
CREATE UNIQUE INDEX IF NOT EXISTS payments_staff_product_sale_idempotency_uidx
  ON public.payments (tenant_id, (metadata->>'idempotency_key'))
  WHERE (metadata->>'source') = 'staff_product_sale'
    AND (metadata->>'idempotency_key') IS NOT NULL
    AND tenant_id IS NOT NULL;
