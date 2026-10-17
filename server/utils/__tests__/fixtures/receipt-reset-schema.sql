-- Disposable schema for receipt-reset tests.
-- Constraints and function bodies below were read from the non-production
-- database on 2026-10-16. They are not a full production clone.
-- get_payments_monthly_summary is not defined in this repository.
-- The body below matches that database and the production function text read on 2026-10-16.
-- Both sum payments where payment_status = 'completed', grouped by created_at month.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$ SELECT NULL::uuid $$;

CREATE TABLE public.users (
  id uuid PRIMARY KEY,
  tenant_id uuid,
  auth_user_id uuid,
  role text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  first_name text NOT NULL DEFAULT 'Synthetic',
  last_name text NOT NULL DEFAULT 'User'
);

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY,
  tenant_id uuid,
  user_id uuid,
  staff_id uuid,
  status text NOT NULL,
  updated_at timestamptz
);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY,
  tenant_id uuid,
  invoice_number varchar NOT NULL,
  invoice_date date NOT NULL,
  due_date date NOT NULL,
  status varchar NOT NULL,
  payment_status varchar NOT NULL,
  subtotal_rappen integer NOT NULL,
  vat_rate numeric DEFAULT 7.70,
  vat_amount_rappen integer NOT NULL,
  discount_amount_rappen integer DEFAULT 0,
  total_amount_rappen integer NOT NULL,
  paid_amount_rappen integer NOT NULL DEFAULT 0,
  credit_applied_rappen integer NOT NULL DEFAULT 0,
  paid_at timestamptz,
  document_kind text NOT NULL DEFAULT 'invoice',
  appointment_id uuid,
  updated_at timestamptz,
  CONSTRAINT check_dates CHECK (due_date >= invoice_date),
  CONSTRAINT check_amounts CHECK (total_amount_rappen >= 0 AND subtotal_rappen >= 0 AND vat_amount_rappen >= 0),
  CONSTRAINT check_status CHECK (status IN ('draft', 'pdf_created', 'sent', 'paid', 'overdue', 'cancelled')),
  CONSTRAINT check_payment_status CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue')),
  CONSTRAINT invoices_document_kind_chk CHECK (document_kind = ANY (ARRAY['invoice', 'quote']))
);

CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY,
  invoice_id uuid NOT NULL,
  tenant_id uuid,
  appointment_id uuid,
  total_price_rappen integer NOT NULL,
  product_name varchar NOT NULL DEFAULT 'Lesson'
);

CREATE TABLE public.invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  tenant_id uuid,
  payment_method varchar(50) NOT NULL,
  payment_reference varchar(255),
  amount_rappen integer NOT NULL,
  currency varchar(3) DEFAULT 'CHF',
  status varchar(20) DEFAULT 'pending',
  payment_date timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT check_payment_status CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  CONSTRAINT check_positive_amount CHECK (amount_rappen > 0)
);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY,
  tenant_id uuid,
  user_id uuid,
  appointment_id uuid,
  invoice_id uuid,
  payment_method text,
  payment_status text,
  total_amount_rappen integer,
  paid_at timestamptz,
  wallee_transaction_id text,
  refunded_amount_rappen integer NOT NULL DEFAULT 0,
  discount_amount_rappen integer,
  description text,
  course_registration_id uuid,
  credit_transaction_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE TABLE public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  tenant_id uuid,
  transaction_type varchar(50) NOT NULL,
  amount_rappen integer NOT NULL,
  balance_before_rappen integer NOT NULL DEFAULT 0,
  balance_after_rappen integer NOT NULL DEFAULT 0,
  payment_method varchar(50),
  reference_id uuid,
  reference_type varchar(50),
  status varchar DEFAULT 'completed',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.accounting_categories (
  id uuid PRIMARY KEY,
  tenant_id uuid,
  type text,
  name text,
  is_active boolean
);

CREATE TABLE public.accounting_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type varchar NOT NULL,
  amount_rappen integer NOT NULL,
  entry_date date NOT NULL,
  description varchar NOT NULL,
  category_id uuid,
  linked_payment_id uuid,
  tenant_id uuid,
  locked_at timestamptz,
  storno_of_id uuid,
  approval_status text NOT NULL DEFAULT 'approved',
  is_paid boolean,
  paid_date date,
  document_kind text,
  source text NOT NULL DEFAULT 'manual',
  external_reference text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounting_entries_amount_rappen_check CHECK (amount_rappen > 0),
  CONSTRAINT accounting_entries_approval_status_check CHECK (approval_status = ANY (ARRAY['pending', 'approved', 'rejected'])),
  CONSTRAINT accounting_entries_document_kind_chk CHECK (document_kind IS NULL OR document_kind = ANY (ARRAY['expense', 'spesen', 'creditor', 'debtor', 'contract', 'document'])),
  CONSTRAINT accounting_entries_source_chk CHECK (source = ANY (ARRAY['manual', 'staff', 'email', 'camt', 'system'])),
  CONSTRAINT accounting_entries_type_check CHECK (type IN ('income', 'expense'))
);

CREATE UNIQUE INDEX accounting_entries_linked_payment_live_uidx
  ON public.accounting_entries (linked_payment_id)
  WHERE linked_payment_id IS NOT NULL
    AND deleted_at IS NULL
    AND storno_of_id IS NULL;

CREATE TABLE public.accounting_journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  entry_id uuid NOT NULL,
  account_id uuid NOT NULL,
  debit_rappen integer NOT NULL DEFAULT 0,
  credit_rappen integer NOT NULL DEFAULT 0
);

CREATE TABLE public.cash_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid,
  tenant_id uuid,
  instructor_id uuid,
  student_id uuid,
  amount_rappen integer,
  notes text,
  status text
);

CREATE TABLE public.student_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  tenant_id uuid,
  balance_rappen integer NOT NULL DEFAULT 0
);

CREATE TABLE public.payment_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL,
  operation varchar NOT NULL,
  old_payment_status varchar,
  new_payment_status varchar,
  old_total_amount_rappen integer,
  new_total_amount_rappen integer,
  old_payment_method varchar,
  new_payment_method varchar,
  old_values jsonb,
  new_values jsonb
);

CREATE TABLE public.bank_import_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  invoice_id uuid,
  dedupe_key text NOT NULL,
  amount_rappen bigint NOT NULL
);

-- public.update_invoice_status as read on 2026-10-16
CREATE OR REPLACE FUNCTION public.update_invoice_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF COALESCE(NEW.document_kind, 'invoice') = 'quote' THEN
    RETURN NEW;
  END IF;

  IF NEW.due_date < CURRENT_DATE AND NEW.status = 'sent' AND NEW.payment_status != 'paid' THEN
    NEW.status := 'overdue';
    NEW.payment_status := 'overdue';
  END IF;

  IF NEW.paid_amount_rappen >= NEW.total_amount_rappen AND NEW.payment_status != 'paid' THEN
    NEW.payment_status := 'paid';
    NEW.status := 'paid';
    NEW.paid_at := COALESCE(NEW.paid_at, NOW());
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trigger_update_invoice_status
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION update_invoice_status();

-- public.update_appointment_status_on_invoice_paid as read on 2026-10-16
CREATE OR REPLACE FUNCTION public.update_appointment_status_on_invoice_paid()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    IF NEW.appointment_id IS NOT NULL THEN
      UPDATE appointments
      SET status = 'paid', updated_at = NOW()
      WHERE id = NEW.appointment_id;
    END IF;

    UPDATE appointments
    SET status = 'paid', updated_at = NOW()
    WHERE id IN (
      SELECT appointment_id
      FROM invoice_items
      WHERE invoice_id = NEW.id AND appointment_id IS NOT NULL
    );
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trigger_update_appointment_status_on_invoice_paid
  AFTER UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION update_appointment_status_on_invoice_paid();

-- public.book_payment_to_accounting as read on 2026-10-16.
-- A later repository variant adds a product category. Both return before
-- inserting income when the new status is neither completed nor paid.
CREATE OR REPLACE FUNCTION public.book_payment_to_accounting()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cat_id uuid;
  cat_name text;
  existing_id uuid;
  pay_date date;
  descr text;
  amt integer;
BEGIN
  amt := COALESCE(NEW.total_amount_rappen, 0);

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
$function$;

CREATE TRIGGER payments_book_accounting
  AFTER INSERT OR UPDATE OF payment_status, refunded_amount_rappen, total_amount_rappen, description, paid_at
  ON public.payments
  FOR EACH ROW EXECUTE FUNCTION book_payment_to_accounting();

-- public.get_payments_monthly_summary as read on 2026-10-16
CREATE OR REPLACE FUNCTION public.get_payments_monthly_summary(p_tenant_id uuid, p_year integer)
 RETURNS TABLE(month integer, total_rappen bigint, count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(MONTH FROM created_at)::INT AS month,
    SUM(total_amount_rappen)::BIGINT AS total_rappen,
    COUNT(*)::BIGINT AS count
  FROM payments
  WHERE tenant_id = p_tenant_id
    AND payment_status = 'completed'
    AND created_at >= make_date(p_year, 1, 1)::TIMESTAMPTZ
    AND created_at < make_date(p_year + 1, 1, 1)::TIMESTAMPTZ
  GROUP BY EXTRACT(MONTH FROM created_at)
  ORDER BY month;
END;
$function$;

-- Live invoice VAT trigger. It rewrites totals on every insert and update.
-- Synthetic rows set vat_rate to 0 so a zero VAT amount stays consistent.
CREATE OR REPLACE FUNCTION public.calculate_invoice_vat()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  NEW.vat_amount_rappen := ROUND((NEW.subtotal_rappen * NEW.vat_rate / 100)::NUMERIC);
  NEW.total_amount_rappen := NEW.subtotal_rappen + NEW.vat_amount_rappen - NEW.discount_amount_rappen;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trigger_calculate_invoice_vat
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION calculate_invoice_vat();

CREATE OR REPLACE FUNCTION public.prevent_client_payment_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE TRIGGER trg_prevent_client_payment_mutation
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_client_payment_mutation();

CREATE OR REPLACE FUNCTION public.log_payment_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_old_status varchar;
  v_new_status varchar;
BEGIN
  v_old_status := CASE WHEN TG_OP = 'UPDATE' THEN OLD.payment_status ELSE NULL END;
  v_new_status := CASE WHEN TG_OP = 'UPDATE' THEN NEW.payment_status ELSE NULL END;

  IF TG_OP != 'DELETE' THEN
    INSERT INTO payment_audit_logs (
      payment_id, operation, old_payment_status, new_payment_status,
      old_total_amount_rappen, new_total_amount_rappen,
      old_payment_method, new_payment_method, old_values, new_values
    ) VALUES (
      CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.id END,
      TG_OP,
      v_old_status,
      v_new_status,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.total_amount_rappen ELSE NULL END,
      CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.total_amount_rappen END,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.payment_method ELSE NULL END,
      CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.payment_method END,
      CASE WHEN TG_OP = 'DELETE' THEN NULL WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
      CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END
    );
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$;

CREATE TRIGGER trigger_log_payment_changes
  AFTER INSERT OR DELETE OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.log_payment_changes();

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
  IF NEW.appointment_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.payment_method = 'cash' AND NEW.payment_status = 'completed' THEN
    SELECT user_id AS student_id, staff_id AS instructor_id, id AS appointment_id
    INTO v_appointment_data
    FROM appointments
    WHERE id = NEW.appointment_id;

    IF v_appointment_data.instructor_id IS NULL THEN
      v_instructor_id := auth.uid();
    ELSE
      v_instructor_id := v_appointment_data.instructor_id;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM cash_transactions
      WHERE appointment_id = NEW.appointment_id
        AND status != 'disputed'
    ) THEN
      INSERT INTO cash_transactions (
        instructor_id, student_id, appointment_id, amount_rappen, notes, status
      ) VALUES (
        v_instructor_id,
        v_appointment_data.student_id,
        v_appointment_data.appointment_id,
        NEW.total_amount_rappen,
        CONCAT('Automatisch erstellt aus Payment ID: ', NEW.id),
        'pending'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trigger_create_cash_transaction
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.create_cash_transaction_from_payment();

CREATE OR REPLACE FUNCTION public.release_gift_card_reservation(p_payment_id uuid)
RETURNS void LANGUAGE plpgsql AS $function$ BEGIN RETURN; END $function$;

CREATE OR REPLACE FUNCTION public.decrement_discount_usage(p_id uuid)
RETURNS void LANGUAGE plpgsql AS $function$ BEGIN RETURN; END $function$;

CREATE OR REPLACE FUNCTION public.decrement_voucher_code_redemption(p_id uuid)
RETURNS void LANGUAGE plpgsql AS $function$ BEGIN RETURN; END $function$;

CREATE OR REPLACE FUNCTION public.release_checkout_benefits_on_payment_close()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_release_checkout_benefits
  AFTER UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.release_checkout_benefits_on_payment_close();
