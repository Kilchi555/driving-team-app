-- Supabase Database Linter (SECURITY):
-- 0010 security_definer_view → course_registrations_with_participant als SECURITY INVOKER
-- 0013 / 0023 rls_disabled_in_public + sensitive_columns → RLS auf Server-only Analytics-Tabellen
--
-- Hinweis: Inserts/Reads laufen bei euch über den Service Role; der umgeht RLS.
--          Ohne Policies für anon/authenticated ist Zugriff über PostgREST-JWT blockiert.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) View: SECURITY INVOKER (Postgres 15+), weiterhin security_barrier
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.course_registrations_with_participant;

DO $v$
DECLARE
  use_created_by boolean;
  has_leads boolean;
  has_participants boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'course_leads'
  ) INTO has_leads;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'course_participants'
  ) INTO has_participants;

  IF has_leads THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'course_leads' AND column_name = 'created_by'
    ) INTO use_created_by;

    IF use_created_by THEN
      EXECUTE $sql$
CREATE VIEW public.course_registrations_with_participant
  WITH (security_invoker = true) AS
SELECT
  cr.id,
  cr.course_id,
  cr.participant_id,
  cr.user_id,
  cr.tenant_id,
  cr.status,
  cr.payment_status,
  cr.payment_id,
  cr.payment_method,
  cr.registered_by,
  cr.notes,
  cr.sari_synced,
  cr.sari_synced_at,
  cr.created_at,
  cr.updated_at,
  cr.deleted_at,
  cr.deleted_by,
  cr.registered_at,
  COALESCE(cl.first_name, cr.first_name) AS first_name,
  COALESCE(cl.last_name, cr.last_name) AS last_name,
  COALESCE(cl.email, cr.email) AS email,
  COALESCE(cl.phone, cr.phone) AS phone,
  COALESCE(cl.street, cr.street) AS street,
  COALESCE(cl.zip, cr.zip) AS zip,
  COALESCE(cl.city, cr.city) AS city,
  cl.faberid,
  cl.birthdate,
  cl.created_by AS participant_created_by
FROM public.course_registrations cr
LEFT JOIN public.course_leads cl
  ON cr.participant_id = cl.id
  AND cr.tenant_id = cl.tenant_id
$sql$;
    ELSE
      EXECUTE $sql$
CREATE VIEW public.course_registrations_with_participant
  WITH (security_invoker = true) AS
SELECT
  cr.id,
  cr.course_id,
  cr.participant_id,
  cr.user_id,
  cr.tenant_id,
  cr.status,
  cr.payment_status,
  cr.payment_id,
  cr.payment_method,
  cr.registered_by,
  cr.notes,
  cr.sari_synced,
  cr.sari_synced_at,
  cr.created_at,
  cr.updated_at,
  cr.deleted_at,
  cr.deleted_by,
  cr.registered_at,
  COALESCE(cl.first_name, cr.first_name) AS first_name,
  COALESCE(cl.last_name, cr.last_name) AS last_name,
  COALESCE(cl.email, cr.email) AS email,
  COALESCE(cl.phone, cr.phone) AS phone,
  COALESCE(cl.street, cr.street) AS street,
  COALESCE(cl.zip, cr.zip) AS zip,
  COALESCE(cl.city, cr.city) AS city,
  cl.faberid,
  cl.birthdate,
  NULL::uuid AS participant_created_by
FROM public.course_registrations cr
LEFT JOIN public.course_leads cl
  ON cr.participant_id = cl.id
  AND cr.tenant_id = cl.tenant_id
$sql$;
    END IF;

  ELSIF has_participants THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'course_participants' AND column_name = 'created_by'
    ) INTO use_created_by;

    IF use_created_by THEN
      EXECUTE $sql$
CREATE VIEW public.course_registrations_with_participant
  WITH (security_invoker = true) AS
SELECT
  cr.id,
  cr.course_id,
  cr.participant_id,
  cr.user_id,
  cr.tenant_id,
  cr.status,
  cr.payment_status,
  cr.payment_id,
  cr.payment_method,
  cr.registered_by,
  cr.notes,
  cr.sari_synced,
  cr.sari_synced_at,
  cr.created_at,
  cr.updated_at,
  cr.deleted_at,
  cr.deleted_by,
  cr.registered_at,
  COALESCE(cp.first_name, cr.first_name) AS first_name,
  COALESCE(cp.last_name, cr.last_name) AS last_name,
  COALESCE(cp.email, cr.email) AS email,
  COALESCE(cp.phone, cr.phone) AS phone,
  COALESCE(cp.street, cr.street) AS street,
  COALESCE(cp.zip, cr.zip) AS zip,
  COALESCE(cp.city, cr.city) AS city,
  cp.faberid,
  cp.birthdate,
  cp.created_by AS participant_created_by
FROM public.course_registrations cr
LEFT JOIN public.course_participants cp
  ON cr.participant_id = cp.id
  AND cr.tenant_id = cp.tenant_id
$sql$;
    ELSE
      EXECUTE $sql$
CREATE VIEW public.course_registrations_with_participant
  WITH (security_invoker = true) AS
SELECT
  cr.id,
  cr.course_id,
  cr.participant_id,
  cr.user_id,
  cr.tenant_id,
  cr.status,
  cr.payment_status,
  cr.payment_id,
  cr.payment_method,
  cr.registered_by,
  cr.notes,
  cr.sari_synced,
  cr.sari_synced_at,
  cr.created_at,
  cr.updated_at,
  cr.deleted_at,
  cr.deleted_by,
  cr.registered_at,
  COALESCE(cp.first_name, cr.first_name) AS first_name,
  COALESCE(cp.last_name, cr.last_name) AS last_name,
  COALESCE(cp.email, cr.email) AS email,
  COALESCE(cp.phone, cr.phone) AS phone,
  COALESCE(cp.street, cr.street) AS street,
  COALESCE(cp.zip, cr.zip) AS zip,
  COALESCE(cp.city, cr.city) AS city,
  cp.faberid,
  cp.birthdate,
  NULL::uuid AS participant_created_by
FROM public.course_registrations cr
LEFT JOIN public.course_participants cp
  ON cr.participant_id = cp.id
  AND cr.tenant_id = cp.tenant_id
$sql$;
    END IF;
  ELSE
    RAISE EXCEPTION 'course_registrations_with_participant: weder course_leads noch course_participants gefunden';
  END IF;
END $v$;

COMMENT ON VIEW public.course_registrations_with_participant IS
  'Flattened course_registrations mit Leads/Teilnehmer; SECURITY INVOKER für Supabase-Linter.';

ALTER VIEW public.course_registrations_with_participant SET (security_barrier = on);

-- ---------------------------------------------------------------------------
-- 2) RLS: Website-/Server-Analytics (nur Service Role, kein PostgREST für Kunden)
-- ---------------------------------------------------------------------------
DO $rls$
BEGIN
  IF to_regclass('public.booking_events') IS NOT NULL THEN
    ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.booking_redirects') IS NOT NULL THEN
    ALTER TABLE public.booking_redirects ENABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.calculator_events') IS NOT NULL THEN
    ALTER TABLE public.calculator_events ENABLE ROW LEVEL SECURITY;
  END IF;
END $rls$;

COMMIT;
