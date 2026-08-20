-- Vermögenslage + Kassenschluss + Kündigungs-Export

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS bank_balance_rappen integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS accounting_export_completed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.cash_daily_closes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  close_date date NOT NULL,
  counted_rappen integer NOT NULL,
  book_balance_rappen integer NOT NULL,
  difference_rappen integer NOT NULL,
  notes text,
  closed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cash_daily_closes_tenant_date_idx
  ON public.cash_daily_closes (tenant_id, close_date DESC);

ALTER TABLE public.cash_daily_closes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.accounting_entries
  ADD COLUMN IF NOT EXISTS linked_cash_close_id uuid REFERENCES public.cash_daily_closes(id) ON DELETE SET NULL;

INSERT INTO public.accounting_categories (name, type, color, tenant_id)
SELECT 'Kassendifferenz', 'expense', '#a8a29e', t.tenant_id
FROM (SELECT DISTINCT tenant_id FROM public.accounting_categories WHERE tenant_id IS NOT NULL) t
WHERE NOT EXISTS (
  SELECT 1 FROM public.accounting_categories c
  WHERE c.tenant_id = t.tenant_id AND c.name = 'Kassendifferenz'
);
