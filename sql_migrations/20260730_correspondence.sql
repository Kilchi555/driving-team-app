-- Formal correspondence (Briefe) — same DIN window-envelope layout as invoices,
-- but free-form letters without line items / VAT / Swiss QR.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS next_correspondence_number integer DEFAULT 1;

CREATE TABLE IF NOT EXISTS public.correspondence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  reference_number text NOT NULL,
  document_title text NOT NULL DEFAULT 'BRIEF',
  subject text NOT NULL,
  body text NOT NULL DEFAULT '',
  salutation text,
  closing text,
  their_reference text,
  letter_date date NOT NULL DEFAULT (timezone('Europe/Zurich', now()))::date,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent')),
  -- Address snapshot at create/send time (stammdaten can change later)
  recipient_name text,
  billing_company_name text,
  billing_street text,
  billing_zip text,
  billing_city text,
  billing_email text,
  sent_at timestamptz,
  sent_to_email text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT correspondence_tenant_reference_key UNIQUE (tenant_id, reference_number),
  CONSTRAINT correspondence_has_recipient CHECK (user_id IS NOT NULL OR company_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_correspondence_tenant_created
  ON public.correspondence (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_correspondence_tenant_user
  ON public.correspondence (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_correspondence_tenant_company
  ON public.correspondence (tenant_id, company_id);
CREATE INDEX IF NOT EXISTS idx_correspondence_tenant_status
  ON public.correspondence (tenant_id, status);

ALTER TABLE public.correspondence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS correspondence_tenant_access ON public.correspondence;
CREATE POLICY correspondence_tenant_access ON public.correspondence
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT u.tenant_id FROM public.users u
      WHERE u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT u.tenant_id FROM public.users u
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.allocate_correspondence_number(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_num integer;
  v_year integer := EXTRACT(YEAR FROM timezone('Europe/Zurich', now()))::integer;
BEGIN
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id required';
  END IF;

  UPDATE public.tenants
  SET next_correspondence_number = COALESCE(next_correspondence_number, 1) + 1
  WHERE id = p_tenant_id
  RETURNING next_correspondence_number - 1
  INTO v_num;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'tenant not found: %', p_tenant_id;
  END IF;

  IF v_num IS NULL OR v_num < 1 THEN
    v_num := 1;
  END IF;

  RETURN 'BR-' || v_year::text || '-' || lpad(v_num::text, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.allocate_correspondence_number(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_correspondence_number(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.allocate_correspondence_number(uuid) TO authenticated;
