-- PR #421 Path A — curated minimal schema for disposable PostgreSQL 17.
-- NOT production-equivalent. Proofs apply only to this disposable schema.
-- Apply BEFORE migrations/20261012_enroll_public_cash_course_with_pending_payment.sql
-- Do not point this at Production or shared staging.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Supabase-compatible roles (empty postgres:17 image lacks these)
-- ---------------------------------------------------------------------------
DO $$ BEGIN CREATE ROLE anon NOLOGIN NOINHERIT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN NOINHERIT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Stub auth.role() so F1 RLS policies referencing auth.role() resolve.
-- F1 SECURITY DEFINER sets request.jwt.claim.role = service_role.
CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.role', true), '');
$$;

REVOKE ALL ON FUNCTION auth.role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth.role() TO PUBLIC;

-- ---------------------------------------------------------------------------
-- Core tables (columns required by F1 enroll + claim/complete)
-- Deliberate omissions documented in SCHEMA-DRIFT.md
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'pr421-fixture',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'PR421 Course',
  max_participants integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
  -- OMITTED: course_instructor_check and production-only columns (see SCHEMA-DRIFT.md)
);

CREATE TABLE IF NOT EXISTS public.course_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  first_name text,
  last_name text,
  email text,
  phone text,
  sari_faberid text,
  street text,
  street_nr text,
  zip text,
  city text,
  birthdate date,
  license_number text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'waitlist', 'cancelled', 'completed')),
  payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method text,
  payment_id uuid,
  amount_paid_rappen integer NOT NULL DEFAULT 0,
  custom_sessions jsonb,
  is_partial_enrollment boolean DEFAULT false,
  partial_start_session integer,
  individual_session_number integer,
  vehicle_id uuid,
  notes text,
  registration_date timestamptz DEFAULT now(),
  registered_at timestamptz,
  sari_synced boolean DEFAULT false,
  sari_synced_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Replicated from migrations/fix_course_registrations_constraints.sql (relevant to F1)
CREATE UNIQUE INDEX IF NOT EXISTS idx_course_registrations_unique_email
  ON public.course_registrations (course_id, email)
  WHERE status IN ('confirmed', 'enrolled');

CREATE UNIQUE INDEX IF NOT EXISTS idx_course_registrations_unique_faberid
  ON public.course_registrations (course_id, sari_faberid)
  WHERE status IN ('confirmed', 'enrolled') AND sari_faberid IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  course_registration_id uuid REFERENCES public.course_registrations(id) ON DELETE SET NULL,
  appointment_id uuid,
  payment_method text NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  payment_provider text,
  total_amount_rappen integer NOT NULL DEFAULT 0,
  lesson_price_rappen integer,
  currency text DEFAULT 'CHF',
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
  -- OMITTED: production payment_provider CHECK (wallee|stripe) — F1 inserts NULL
);

-- Deferred FK: registration.payment_id → payments (after payments exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'course_registrations_payment_id_fkey'
  ) THEN
    ALTER TABLE public.course_registrations
      ADD CONSTRAINT course_registrations_payment_id_fkey
      FOREIGN KEY (payment_id) REFERENCES public.payments(id)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Capacity enforcement (from migrations/20260916_course_atomic_capacity.sql)
CREATE OR REPLACE FUNCTION public.enforce_course_registration_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_max integer;
  v_count integer;
  v_consumes boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  v_consumes := (NEW.deleted_at IS NULL AND NEW.status IS DISTINCT FROM 'cancelled');
  IF NOT v_consumes THEN
    RETURN NEW;
  END IF;

  SELECT c.max_participants
    INTO v_max
  FROM public.courses c
  WHERE c.id = NEW.course_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'course_not_found'
      USING ERRCODE = '23503',
            HINT = 'COURSE_NOT_FOUND';
  END IF;

  SELECT COUNT(*)::integer
    INTO v_count
  FROM public.course_registrations r
  WHERE r.course_id = NEW.course_id
    AND r.deleted_at IS NULL
    AND r.status IS DISTINCT FROM 'cancelled'
    AND (TG_OP = 'INSERT' OR r.id IS DISTINCT FROM NEW.id);

  IF v_count >= COALESCE(v_max, 0) THEN
    RAISE EXCEPTION 'course_capacity_exceeded'
      USING ERRCODE = 'P0001',
            HINT = 'COURSE_FULL';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_course_registration_capacity ON public.course_registrations;
CREATE TRIGGER trg_enforce_course_registration_capacity
  BEFORE INSERT OR UPDATE OF course_id, status, deleted_at
  ON public.course_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_course_registration_capacity();

REVOKE ALL ON FUNCTION public.enforce_course_registration_capacity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_course_registration_capacity() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_course_registration_capacity() TO postgres, service_role;

COMMIT;
