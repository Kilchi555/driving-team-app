-- Invoice numbers unique per tenant (shared prefixes like RE across tenants).
-- Also adds atomic allocate_invoice_number(tenant_id) and resyncs counters.

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoices_tenant_invoice_number_key'
      AND conrelid = 'public.invoices'::regclass
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_tenant_invoice_number_key UNIQUE (tenant_id, invoice_number);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices (invoice_number);

CREATE OR REPLACE FUNCTION public.allocate_invoice_number(p_tenant_id uuid)
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
  SET next_invoice_number = COALESCE(next_invoice_number, 1) + 1
  WHERE id = p_tenant_id
  RETURNING COALESCE(NULLIF(trim(invoice_number_prefix), ''), 'RE'),
            next_invoice_number - 1
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

REVOKE ALL ON FUNCTION public.allocate_invoice_number(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_invoice_number(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.allocate_invoice_number(uuid) TO authenticated;

WITH max_seq AS (
  SELECT
    i.tenant_id,
    MAX(
      CASE
        WHEN i.invoice_number ~ '^[A-Za-z0-9]+-[0-9]{4}-[0-9]+$'
        THEN NULLIF(regexp_replace(i.invoice_number, '^.*-', ''), '')::integer
        ELSE NULL
      END
    ) AS max_n
  FROM public.invoices i
  GROUP BY i.tenant_id
)
UPDATE public.tenants t
SET next_invoice_number = GREATEST(COALESCE(t.next_invoice_number, 1), COALESCE(m.max_n, 0) + 1)
FROM max_seq m
WHERE m.tenant_id = t.id;
