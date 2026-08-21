-- Jahresbudget pro Kategorie (Soll/Ist gegen die Buchhaltung)

CREATE TABLE IF NOT EXISTS public.accounting_budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  year integer NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  category_id uuid REFERENCES public.accounting_categories(id) ON DELETE SET NULL,
  amount_rappen integer NOT NULL DEFAULT 0 CHECK (amount_rappen >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS accounting_budget_lines_uniq
  ON public.accounting_budget_lines (tenant_id, year, type, COALESCE(category_id, '00000000-0000-0000-0000-000000000000'));

CREATE INDEX IF NOT EXISTS accounting_budget_lines_year_idx
  ON public.accounting_budget_lines (tenant_id, year);

ALTER TABLE public.accounting_budget_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS accounting_budget_lines_service_role ON public.accounting_budget_lines;
CREATE POLICY accounting_budget_lines_service_role
  ON public.accounting_budget_lines
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
