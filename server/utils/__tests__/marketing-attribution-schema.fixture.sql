-- Local-only fixture for PR A. Not applied to production.
-- Supabase provides auth.uid(), anon, authenticated and service_role.
-- This fixture creates the same names so the migration can be applied
-- to an empty Postgres and the assertions can exercise RLS.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END $$;

GRANT anon TO CURRENT_USER;
GRANT authenticated TO CURRENT_USER;
GRANT service_role TO CURRENT_USER;

CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id),
  auth_user_id uuid,
  role text,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS public.course_registrations (
  id uuid PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS public.booking_proposals (
  id uuid PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY,
  paid_at timestamptz
);

GRANT SELECT ON public.users TO authenticated;
