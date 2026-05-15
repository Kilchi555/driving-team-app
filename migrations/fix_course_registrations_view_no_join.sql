-- Fix: course_registrations_with_participant ohne JOIN auf course_leads/-participants
-- Grund: Alle Teilnehmerdaten liegen direkt in course_registrations.
--        Der LEFT JOIN auf course_leads war nötig als course_participants existierte,
--        aber seit dem Entfernen dieser Tabellen liegt alles in course_registrations.
--        Mit security_invoker=true müssen RLS-Policies aller beteiligten Tabellen greifen;
--        der Join auf course_leads verursacht leere Resultate bei Client-Abfragen.

DROP VIEW IF EXISTS public.course_registrations_with_participant;

CREATE VIEW public.course_registrations_with_participant
  WITH (security_invoker = true, security_barrier = true)
AS
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
  cr.enrolled_at,
  cr.first_name,
  cr.last_name,
  cr.email,
  cr.phone,
  cr.street,
  cr.zip,
  cr.city,
  cr.sari_faberid                AS faberid,
  NULL::date                     AS birthdate,
  NULL::uuid                     AS participant_created_by,
  cr.sari_data,
  cr.sari_licenses,
  cr.custom_sessions,
  cr.transferred_from_registration_id
FROM public.course_registrations cr;

COMMENT ON VIEW public.course_registrations_with_participant IS
  'Flattened view of course_registrations. Kein JOIN mehr nötig da alle Felder direkt in course_registrations liegen. security_invoker für Supabase-Linter-Compliance.';
