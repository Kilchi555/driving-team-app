CREATE TABLE IF NOT EXISTS public.accounting_recurring_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  interval text NOT NULL CHECK (interval IN ('monthly', 'quarterly', 'yearly')),
  next_due_date date NOT NULL,
  last_created_at timestamptz,
  ends_on date,
  is_active boolean NOT NULL DEFAULT true,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  document_kind text NOT NULL DEFAULT 'expense',
  amount_rappen integer NOT NULL CHECK (amount_rappen >= 0),
  description text NOT NULL,
  category_id uuid REFERENCES public.accounting_categories(id) ON DELETE SET NULL,
  creditor_name text,
  creditor_iban text,
  payment_reference text,
  is_paid boolean NOT NULL DEFAULT false,
  vat_rate numeric,
  vat_amount_rappen integer,
  notes text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS accounting_recurring_due_idx
  ON public.accounting_recurring_entries (tenant_id, next_due_date)
  WHERE is_active;

ALTER TABLE public.accounting_recurring_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS accounting_recurring_entries_service_role ON public.accounting_recurring_entries;
CREATE POLICY accounting_recurring_entries_service_role
  ON public.accounting_recurring_entries
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
