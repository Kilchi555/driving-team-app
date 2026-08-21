-- Offerten: same invoices row, document_kind=quote until acceptance.
-- invoice_number stays NOT NULL (trigger generate_invoice_number) — quotes
-- store OF-… in both quote_number and invoice_number until conversion.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS next_quote_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS quote_number_prefix text NOT NULL DEFAULT 'OF';

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS document_kind text NOT NULL DEFAULT 'invoice',
  ADD COLUMN IF NOT EXISTS quote_number text,
  ADD COLUMN IF NOT EXISTS valid_until date,
  ADD COLUMN IF NOT EXISTS public_token uuid,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS declined_at timestamptz;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoices_document_kind_chk'
      AND conrelid = 'public.invoices'::regclass
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_document_kind_chk
      CHECK (document_kind IN ('invoice', 'quote'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_tenant_quote_number_key
  ON public.invoices (tenant_id, quote_number)
  WHERE quote_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_public_token_key
  ON public.invoices (public_token)
  WHERE public_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS invoices_tenant_kind_idx
  ON public.invoices (tenant_id, document_kind);

CREATE OR REPLACE FUNCTION public.allocate_quote_number(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_num integer;
  v_year integer := EXTRACT(YEAR FROM timezone('Europe/Zurich', now()))::integer;
BEGIN
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id required';
  END IF;

  UPDATE public.tenants
  SET next_quote_number = COALESCE(next_quote_number, 1) + 1
  WHERE id = p_tenant_id
  RETURNING COALESCE(NULLIF(trim(quote_number_prefix), ''), 'OF'),
            next_quote_number - 1
  INTO v_prefix, v_num;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'tenant not found: %', p_tenant_id;
  END IF;

  IF v_num IS NULL OR v_num < 1 THEN
    v_num := 1;
  END IF;

  RETURN v_prefix || '-' || v_year::text || '-' || lpad(v_num::text, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.allocate_quote_number(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_quote_number(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.allocate_quote_number(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_invoice_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  -- Offerten sind kein Zahlungsdokument — nicht auf overdue/paid drehen.
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

DROP VIEW IF EXISTS public.invoices_with_details;

CREATE VIEW public.invoices_with_details AS
SELECT
  i.id,
  i.invoice_number,
  i.user_id,
  i.staff_id,
  i.appointment_id,
  i.product_sale_id,
  i.tenant_id,
  i.company_id,
  i.billing_type,
  i.billing_company_name,
  i.billing_contact_person,
  i.billing_street,
  i.billing_street_number,
  i.billing_zip,
  i.billing_city,
  i.billing_country,
  i.billing_vat_number,
  i.billing_email,
  i.invoice_date,
  i.due_date,
  i.status,
  i.payment_status,
  i.payment_method,
  i.subtotal_rappen,
  i.vat_rate,
  i.vat_amount_rappen,
  i.total_amount_rappen,
  i.discount_amount_rappen,
  i.paid_amount_rappen,
  i.paid_at,
  i.sent_at,
  i.notes,
  i.internal_notes,
  i.created_at,
  i.updated_at,
  u.first_name AS customer_first_name,
  u.last_name AS customer_last_name,
  u.email AS customer_email,
  u.phone AS customer_phone,
  i.dunning_level,
  i.dunning_paused,
  i.last_dunning_sent_at,
  i.dunning_fees_rappen,
  i.dunning_due_date,
  i.payment_terms,
  i.footer_text,
  i.document_kind,
  i.quote_number,
  i.valid_until,
  i.public_token,
  i.accepted_at,
  i.declined_at
FROM invoices i
LEFT JOIN users u ON i.user_id = u.id;

GRANT SELECT ON public.invoices_with_details TO authenticated;
GRANT SELECT ON public.invoices_with_details TO service_role;
