-- Doppelte Buchhaltung: KMU-Kontenplan + Journalzeilen an bestehenden Buchungsköpfen.

CREATE TABLE IF NOT EXISTS public.accounting_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  number text NOT NULL,
  name text NOT NULL,
  class smallint NOT NULL CHECK (class BETWEEN 1 AND 9),
  type text NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'income', 'expense')),
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, number)
);

CREATE INDEX IF NOT EXISTS accounting_accounts_tenant_idx
  ON public.accounting_accounts (tenant_id, number);

ALTER TABLE public.accounting_accounts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.accounting_journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES public.accounting_entries(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounting_accounts(id),
  debit_rappen integer NOT NULL DEFAULT 0 CHECK (debit_rappen >= 0),
  credit_rappen integer NOT NULL DEFAULT 0 CHECK (credit_rappen >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounting_journal_lines_one_side_chk
    CHECK ((debit_rappen > 0 AND credit_rappen = 0) OR (credit_rappen > 0 AND debit_rappen = 0))
);

CREATE INDEX IF NOT EXISTS accounting_journal_lines_entry_idx
  ON public.accounting_journal_lines (entry_id);
CREATE INDEX IF NOT EXISTS accounting_journal_lines_tenant_account_idx
  ON public.accounting_journal_lines (tenant_id, account_id);

ALTER TABLE public.accounting_journal_lines ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.accounting_categories
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounting_accounts(id) ON DELETE SET NULL;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS default_payment_account_id uuid REFERENCES public.accounting_accounts(id) ON DELETE SET NULL;
