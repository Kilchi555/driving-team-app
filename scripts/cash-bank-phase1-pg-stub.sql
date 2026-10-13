-- Disposable schema for the cash-to-bank remediation test. Not a production migration.
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text
LANGUAGE sql STABLE AS $$ SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'postgres') $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY,
  bank_balance_rappen integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id),
  role text NOT NULL,
  is_active boolean DEFAULT true,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.bank_import_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  dedupe_key text NOT NULL,
  bank_ref text,
  entry_date date,
  amount_rappen bigint NOT NULL,
  reference text,
  debtor_name text,
  invoice_id uuid,
  accounting_entry_id uuid,
  imported_by uuid,
  source text NOT NULL DEFAULT 'camt',
  UNIQUE (tenant_id, dedupe_key)
);

CREATE TABLE IF NOT EXISTS public.cash_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid,
  tenant_id uuid,
  current_balance_rappen integer NOT NULL DEFAULT 0 CHECK (current_balance_rappen >= 0),
  office_cash_register_id uuid,
  register_type text,
  last_updated timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL,
  tenant_id uuid,
  movement_type text NOT NULL,
  amount_rappen integer NOT NULL CHECK (amount_rappen > 0),
  balance_before_rappen integer NOT NULL,
  balance_after_rappen integer NOT NULL,
  reference_id uuid,
  reference_type text,
  performed_by uuid NOT NULL,
  notes text,
  office_cash_register_id uuid,
  register_type text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT cash_movements_movement_type_check CHECK (movement_type = ANY (ARRAY[
    'deposit','withdrawal','cash_transaction','adjustment','system_init','cash_handover'
  ]))
);
