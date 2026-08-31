-- P0 Buchhaltung: Unveränderbarkeit (edit_history), Privat-Kategorie,
-- automatische Verbuchung von Zahlungen, notes-Spalte für Lohn.

ALTER TABLE public.accounting_entries
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS edit_history jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS accounting_entries_linked_payment_idx
  ON public.accounting_entries (linked_payment_id)
  WHERE linked_payment_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS accounting_entries_linked_payment_live_uidx
  ON public.accounting_entries (linked_payment_id)
  WHERE linked_payment_id IS NOT NULL
    AND deleted_at IS NULL
    AND storno_of_id IS NULL;

INSERT INTO public.accounting_categories (name, type, color, tenant_id)
SELECT 'Eigenverbrauch / Privat', 'expense', '#ea580c', t.tenant_id
FROM (SELECT DISTINCT tenant_id FROM public.accounting_categories WHERE tenant_id IS NOT NULL) t
WHERE NOT EXISTS (
  SELECT 1
  FROM public.accounting_categories c
  WHERE c.tenant_id = t.tenant_id
    AND c.name = 'Eigenverbrauch / Privat'
    AND c.type = 'expense'
);

CREATE OR REPLACE FUNCTION public.book_payment_to_accounting()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cat_id uuid;
  cat_name text;
  existing_id uuid;
  pay_date date;
  descr text;
  amt integer;
BEGIN
  amt := COALESCE(NEW.total_amount_rappen, 0);

  -- Vollständige Rückerstattung → Storno der Originalbuchung
  IF (
    NEW.payment_status IN ('refunded')
    OR (
      COALESCE(NEW.refunded_amount_rappen, 0) > 0
      AND COALESCE(NEW.refunded_amount_rappen, 0) >= amt
      AND amt > 0
    )
  ) THEN
    SELECT e.id INTO existing_id
    FROM accounting_entries e
    WHERE e.linked_payment_id = NEW.id
      AND e.deleted_at IS NULL
      AND e.storno_of_id IS NULL
    LIMIT 1;

    IF existing_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM accounting_entries s
      WHERE s.storno_of_id = existing_id AND s.deleted_at IS NULL
    ) THEN
      INSERT INTO accounting_entries (
        type, amount_rappen, entry_date, description, category_id,
        storno_of_id, tenant_id, approval_status, is_paid, paid_date
      )
      SELECT
        CASE WHEN e.type = 'expense' THEN 'income' ELSE 'expense' END,
        e.amount_rappen,
        CURRENT_DATE,
        'Storno: ' || e.description,
        e.category_id,
        e.id,
        e.tenant_id,
        'approved',
        true,
        CURRENT_DATE
      FROM accounting_entries e
      WHERE e.id = existing_id;

      UPDATE accounting_entries
      SET locked_at = COALESCE(locked_at, now())
      WHERE id = existing_id;
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.payment_status IS NULL OR NEW.payment_status NOT IN ('completed', 'paid') THEN
    RETURN NEW;
  END IF;
  IF NEW.tenant_id IS NULL OR amt <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT e.id INTO existing_id
  FROM accounting_entries e
  WHERE e.linked_payment_id = NEW.id
    AND e.deleted_at IS NULL
    AND e.storno_of_id IS NULL
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  cat_name := CASE
    WHEN NEW.course_registration_id IS NOT NULL THEN 'Kurse'
    ELSE 'Termine'
  END;

  SELECT c.id INTO cat_id
  FROM accounting_categories c
  WHERE c.tenant_id = NEW.tenant_id
    AND c.type = 'income'
    AND c.name = cat_name
    AND c.is_active IS DISTINCT FROM false
  LIMIT 1;

  pay_date := COALESCE(NEW.paid_at, NEW.created_at)::date;
  descr := left(COALESCE(NULLIF(btrim(NEW.description), ''), 'Zahlung'), 500);

  INSERT INTO accounting_entries (
    type, amount_rappen, entry_date, description, category_id,
    linked_payment_id, is_paid, paid_date, tenant_id, approval_status
  ) VALUES (
    'income', amt, pay_date, descr, cat_id,
    NEW.id, true, pay_date, NEW.tenant_id, 'approved'
  );

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_book_accounting ON public.payments;
CREATE TRIGGER payments_book_accounting
  AFTER INSERT OR UPDATE OF payment_status, refunded_amount_rappen, total_amount_rappen, description, paid_at
  ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.book_payment_to_accounting();

CREATE OR REPLACE FUNCTION public.backfill_accounting_from_payments(p_tenant_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  booked integer := 0;
BEGIN
  WITH candidates AS (
    SELECT
      p.id,
      p.tenant_id,
      p.total_amount_rappen,
      COALESCE(p.paid_at, p.created_at)::date AS pay_date,
      left(COALESCE(NULLIF(btrim(p.description), ''), 'Zahlung'), 500) AS descr,
      CASE
        WHEN p.course_registration_id IS NOT NULL THEN 'Kurse'
        ELSE 'Termine'
      END AS cat_name
    FROM payments p
    WHERE p.payment_status IN ('completed', 'paid')
      AND p.tenant_id IS NOT NULL
      AND COALESCE(p.total_amount_rappen, 0) > 0
      AND (p_tenant_id IS NULL OR p.tenant_id = p_tenant_id)
      AND NOT EXISTS (
        SELECT 1 FROM accounting_entries e
        WHERE e.linked_payment_id = p.id
          AND e.deleted_at IS NULL
          AND e.storno_of_id IS NULL
      )
  ),
  inserted AS (
    INSERT INTO accounting_entries (
      type, amount_rappen, entry_date, description, category_id,
      linked_payment_id, is_paid, paid_date, tenant_id, approval_status
    )
    SELECT
      'income',
      c.total_amount_rappen,
      c.pay_date,
      c.descr,
      cat.id,
      c.id,
      true,
      c.pay_date,
      c.tenant_id,
      'approved'
    FROM candidates c
    LEFT JOIN accounting_categories cat
      ON cat.tenant_id = c.tenant_id
     AND cat.type = 'income'
     AND cat.name = c.cat_name
     AND cat.is_active IS DISTINCT FROM false
    ON CONFLICT (linked_payment_id)
      WHERE linked_payment_id IS NOT NULL
        AND deleted_at IS NULL
        AND storno_of_id IS NULL
    DO NOTHING
    RETURNING id
  )
  SELECT COUNT(*) INTO booked FROM inserted;

  RETURN booked;
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_accounting_from_payments(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.book_payment_to_accounting() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_accounting_from_payments(uuid) TO postgres, service_role;

SELECT public.backfill_accounting_from_payments(NULL);
