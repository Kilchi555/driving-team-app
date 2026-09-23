-- Local-only fixture for course invoice phase 1.
-- Not a migration. Do not apply this file to production.
-- Creates the smallest parent schema the phase-1 migration alters, then the
-- assertions file checks behavior. Roles anon / authenticated / service_role
-- are created here because a stock PostgreSQL does not have them.

CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(nullif(current_setting('test.auth_role', true), ''), '');
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY,
  invoice_due_days integer DEFAULT 30,
  invoice_number_prefix text DEFAULT 'RE',
  next_invoice_number integer DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id),
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  first_name text,
  last_name text,
  email text,
  auth_user_id uuid,
  role text
);

CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id),
  name text,
  contact_person text,
  email text,
  street text,
  street_nr text,
  zip text,
  city text,
  country text,
  vat_number text
);

CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id),
  name text NOT NULL,
  company_id uuid REFERENCES public.companies(id),
  billing_mode text NOT NULL DEFAULT 'individual',
  CONSTRAINT courses_billing_mode_check CHECK (billing_mode IN ('individual', 'company_collective'))
);

CREATE TABLE IF NOT EXISTS public.course_categories (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  code text NOT NULL,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.course_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  user_id uuid REFERENCES public.users(id),
  first_name text,
  last_name text,
  email text,
  phone text,
  street text,
  street_nr text,
  zip text,
  city text,
  status text DEFAULT 'pending',
  payment_status text DEFAULT 'pending',
  payment_id uuid,
  amount_paid_rappen integer DEFAULT 0,
  payment_method text,
  discount_applied_rappen integer DEFAULT 0,
  deleted_at timestamptz,
  sari_data jsonb,
  sari_synced boolean,
  sari_synced_at timestamptz,
  sari_faberid text,
  sari_license_id text,
  sari_licenses jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.voucher_codes (
  id uuid PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id),
  code text NOT NULL,
  credit_amount_rappen integer NOT NULL
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id),
  staff_id uuid REFERENCES public.users(id),
  tenant_id uuid REFERENCES public.tenants(id),
  company_id uuid REFERENCES public.companies(id),
  invoice_number varchar(50) NOT NULL,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL DEFAULT (CURRENT_DATE + 30),
  billing_type varchar(20) DEFAULT 'individual',
  billing_company_name text,
  billing_contact_person text,
  billing_email text,
  billing_street text,
  billing_zip text,
  billing_city text,
  billing_country text DEFAULT 'CH',
  billing_vat_number text,
  subtotal_rappen integer NOT NULL,
  vat_rate numeric(5,2) DEFAULT 7.70,
  vat_amount_rappen integer NOT NULL,
  discount_amount_rappen integer DEFAULT 0,
  total_amount_rappen integer NOT NULL,
  status varchar(20) DEFAULT 'draft',
  payment_status varchar(20) DEFAULT 'pending',
  payment_method varchar(50),
  paid_amount_rappen integer DEFAULT 0,
  document_kind text NOT NULL DEFAULT 'invoice',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT check_billing_type CHECK (billing_type IN ('individual', 'company')),
  CONSTRAINT check_status CHECK (status IN ('draft', 'pdf_created', 'sent', 'paid', 'overdue', 'cancelled')),
  CONSTRAINT check_payment_status CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue')),
  CONSTRAINT check_amounts CHECK (
    total_amount_rappen >= 0 AND subtotal_rappen >= 0 AND vat_amount_rappen >= 0
  ),
  CONSTRAINT check_dates CHECK (due_date >= invoice_date),
  CONSTRAINT invoices_tenant_invoice_number_key UNIQUE (tenant_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id),
  tenant_id uuid REFERENCES public.tenants(id),
  product_name varchar(255) NOT NULL,
  product_description text,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price_rappen integer NOT NULL,
  total_price_rappen integer NOT NULL,
  vat_rate numeric(5,2) DEFAULT 7.70,
  vat_amount_rappen integer NOT NULL,
  sort_order integer DEFAULT 0,
  CONSTRAINT check_positive_amounts CHECK (
    quantity > 0 AND unit_price_rappen >= 0 AND total_price_rappen >= 0
  )
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  course_registration_id uuid REFERENCES public.course_registrations(id),
  payment_status text,
  total_amount_rappen integer,
  refunded_amount_rappen integer NOT NULL DEFAULT 0
);

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

CREATE OR REPLACE FUNCTION public.calculate_invoice_vat()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.vat_amount_rappen := ROUND((NEW.subtotal_rappen * NEW.vat_rate / 100)::numeric);
  NEW.total_amount_rappen := NEW.subtotal_rappen + NEW.vat_amount_rappen - COALESCE(NEW.discount_amount_rappen, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_calculate_invoice_vat ON public.invoices;
CREATE TRIGGER trigger_calculate_invoice_vat
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_invoice_vat();

INSERT INTO public.tenants (id, invoice_due_days, invoice_number_prefix, next_invoice_number)
VALUES
  ('11111111-1111-4111-8111-111111111111', 14, 'RE', 7),
  ('22222222-2222-4222-8222-222222222222', 30, 'RE', 1);

INSERT INTO public.users (id, tenant_id, first_name, last_name, email, role)
VALUES
  ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 'Ada', 'Fahrer', 'ada@example.test', 'client'),
  ('44444444-4444-4444-8444-444444444444', '22222222-2222-4222-8222-222222222222', 'Bea', 'Andere', 'bea@example.test', 'client');

INSERT INTO public.companies (id, tenant_id, name, contact_person, email, street, street_nr, zip, city, country)
VALUES (
  '88888888-8888-4888-8888-888888888888',
  '11111111-1111-4111-8111-111111111111',
  'Firma AG', 'Max Kontakt', 'firma@example.test', 'Werkstrasse', '2', '8000', 'Zürich', 'CH'
);

INSERT INTO public.companies (id, tenant_id, name)
VALUES (
  '88888888-8888-4888-8888-888888888899',
  '22222222-2222-4222-8222-222222222222',
  'Fremde AG'
);

INSERT INTO public.courses (id, tenant_id, name, billing_mode)
VALUES (
  '55555555-5555-4555-8555-555555555555',
  '11111111-1111-4111-8111-111111111111',
  'VKU Abend',
  'individual'
);

INSERT INTO public.courses (id, tenant_id, name, company_id, billing_mode)
VALUES (
  '55555555-5555-4555-8555-555555555556',
  '11111111-1111-4111-8111-111111111111',
  'Firmen VKU',
  '88888888-8888-4888-8888-888888888888',
  'company_collective'
);

INSERT INTO public.courses (id, tenant_id, name)
VALUES (
  '55555555-5555-4555-8555-555555555557',
  '22222222-2222-4222-8222-222222222222',
  'Fremder Kurs'
);

INSERT INTO public.course_categories (id, tenant_id, code, name)
VALUES (
  '99999999-9999-4999-8999-999999999999',
  '11111111-1111-4111-8111-111111111111',
  'VKU',
  'Verkehrskunde'
);

INSERT INTO public.course_registrations (
  id, course_id, tenant_id, user_id, first_name, last_name, email, status, payment_status
) VALUES (
  '66666666-6666-4666-8666-666666666666',
  '55555555-5555-4555-8555-555555555555',
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  'Ada', 'Fahrer', 'ada@example.test', 'confirmed', 'pending'
);

INSERT INTO public.course_registrations (
  id, course_id, tenant_id, user_id, first_name, last_name, email, status
) VALUES (
  '77777777-7777-4777-8777-777777777777',
  '55555555-5555-4555-8555-555555555557',
  '22222222-2222-4222-8222-222222222222',
  '44444444-4444-4444-8444-444444444444',
  'Bea', 'Andere', 'bea@example.test', 'confirmed'
);

INSERT INTO public.invoices (
  id, user_id, tenant_id, invoice_number,   subtotal_rappen, vat_rate, vat_amount_rappen,
  total_amount_rappen, status, payment_status, document_kind
) VALUES (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '33333333-3333-4333-8333-333333333333',
  '11111111-1111-4111-8111-111111111111',
  'RE-2020-0001',
  5000, 0, 0, 5000, 'sent', 'pending', 'invoice'
);

INSERT INTO public.invoices (
  id, user_id, tenant_id, invoice_number,   subtotal_rappen, vat_rate, vat_amount_rappen,
  total_amount_rappen, status, payment_status, document_kind
) VALUES (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '44444444-4444-4444-8444-444444444444',
  '22222222-2222-4222-8222-222222222222',
  'RE-2020-0002',
  9000, 0, 0, 9000, 'pdf_created', 'paid', 'invoice'
);

INSERT INTO public.voucher_codes (id, tenant_id, code, credit_amount_rappen)
VALUES
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '11111111-1111-4111-8111-111111111111', 'SAVE', 500),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '22222222-2222-4222-8222-222222222222', 'OTHER', 500);
