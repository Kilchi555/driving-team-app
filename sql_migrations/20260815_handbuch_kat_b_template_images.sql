-- Attach extracted Handbuch Kat. B photos to matching driving-school topics.
-- Images live in the public evaluation-content bucket; this only updates JSON refs.
-- Idempotent: skips rows that already reference handbuch-kat-b.

WITH img(name, sections) AS (
  VALUES
    (
      'Sitzposition',
      '[
        {"title":"Sitzposition und Gurteinstellung","images":["https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/evaluation-content/evaluation-content/templates/handbuch-kat-b/sitzposition/sitzposition-gurte.jpg"],"categories":["B","B Schaltung","B Automatik"]},
        {"title":"Einstellung der Rückspiegel","images":["https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/evaluation-content/evaluation-content/templates/handbuch-kat-b/sitzposition/innenspiegel.jpg","https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/evaluation-content/evaluation-content/templates/handbuch-kat-b/sitzposition/aussenspiegel-links.jpg","https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/evaluation-content/evaluation-content/templates/handbuch-kat-b/sitzposition/aussenspiegel-rechts.jpg"],"categories":["B","B Schaltung","B Automatik"]}
      ]'::jsonb
    ),
    (
      'Lenktechnik',
      '[
        {"title":"Lenkradhaltung 9 und 3 Uhr","images":["https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/evaluation-content/evaluation-content/templates/handbuch-kat-b/lenktechnik/lenkradhaltung.jpg"],"categories":["B","B Schaltung","B Automatik"]}
      ]'::jsonb
    ),
    (
      'Schaltung',
      '[
        {"title":"Handstellung beim Schalten","images":["https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/evaluation-content/evaluation-content/templates/handbuch-kat-b/schaltung/gang-1-2.jpg","https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/evaluation-content/evaluation-content/templates/handbuch-kat-b/schaltung/gang-3-4.jpg","https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/evaluation-content/evaluation-content/templates/handbuch-kat-b/schaltung/gang-5-6.jpg"],"categories":["B","B Schaltung"]}
      ]'::jsonb
    ),
    (
      'Blicktechnik',
      '[
        {"title":"Blickführung auf geraden Strecken","images":["https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/evaluation-content/evaluation-content/templates/handbuch-kat-b/blicktechnik/gerade-strecke.jpg"],"categories":["B","B Schaltung","B Automatik"]},
        {"title":"Blickführung bei Engpässen","images":["https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/evaluation-content/evaluation-content/templates/handbuch-kat-b/blicktechnik/engpass.jpg"],"categories":["B","B Schaltung","B Automatik"]}
      ]'::jsonb
    ),
    (
      'Gebiet',
      '[
        {"title":"Strassen mit verkehrsberuhigenden Massnahmen","images":["https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/evaluation-content/evaluation-content/templates/handbuch-kat-b/gebiet/tempo-30.jpg"],"categories":["B","B Schaltung","B Automatik"]}
      ]'::jsonb
    )
),
edu_updated AS (
  UPDATE public.evaluation_criteria ec
  SET
    educational_content = jsonb_set(
      CASE
        WHEN ec.educational_content ? '_default' THEN ec.educational_content
        ELSE jsonb_build_object('_default', COALESCE(ec.educational_content, '{}'::jsonb))
      END,
      '{_default,sections}',
      COALESCE(
        CASE
          WHEN ec.educational_content ? '_default' THEN ec.educational_content->'_default'->'sections'
          ELSE ec.educational_content->'sections'
        END,
        '[]'::jsonb
      ) || img.sections
    ),
    updated_at = now()
  FROM img
  WHERE ec.name = img.name
    AND ec.educational_content IS NOT NULL
    AND ec.educational_content::text NOT ILIKE '%handbuch-kat-b%'
    AND (
      ec.tenant_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.tenants t
        WHERE t.id = ec.tenant_id AND t.business_type = 'driving_school'
      )
    )
  RETURNING ec.id
),
SELECT count(*) AS educational_rows FROM edu_updated;

-- Separate statement: Postgres cannot update the same table twice in one WITH.
WITH img(name, sections) AS (
  VALUES
    (
      'Sitzposition',
      '[
        {"title":"Sitzposition und Gurteinstellung","images":["https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/evaluation-content/evaluation-content/templates/handbuch-kat-b/sitzposition/sitzposition-gurte.jpg"],"categories":["B","B Schaltung","B Automatik"]},
        {"title":"Einstellung der Rückspiegel","images":["https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/evaluation-content/evaluation-content/templates/handbuch-kat-b/sitzposition/innenspiegel.jpg","https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/evaluation-content/evaluation-content/templates/handbuch-kat-b/sitzposition/aussenspiegel-links.jpg","https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/evaluation-content/evaluation-content/templates/handbuch-kat-b/sitzposition/aussenspiegel-rechts.jpg"],"categories":["B","B Schaltung","B Automatik"]}
      ]'::jsonb
    ),
    (
      'Lenktechnik',
      '[
        {"title":"Lenkradhaltung 9 und 3 Uhr","images":["https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/evaluation-content/evaluation-content/templates/handbuch-kat-b/lenktechnik/lenkradhaltung.jpg"],"categories":["B","B Schaltung","B Automatik"]}
      ]'::jsonb
    ),
    (
      'Schaltung',
      '[
        {"title":"Handstellung beim Schalten","images":["https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/evaluation-content/evaluation-content/templates/handbuch-kat-b/schaltung/gang-1-2.jpg","https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/evaluation-content/evaluation-content/templates/handbuch-kat-b/schaltung/gang-3-4.jpg","https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/evaluation-content/evaluation-content/templates/handbuch-kat-b/schaltung/gang-5-6.jpg"],"categories":["B","B Schaltung"]}
      ]'::jsonb
    ),
    (
      'Blicktechnik',
      '[
        {"title":"Blickführung auf geraden Strecken","images":["https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/evaluation-content/evaluation-content/templates/handbuch-kat-b/blicktechnik/gerade-strecke.jpg"],"categories":["B","B Schaltung","B Automatik"]},
        {"title":"Blickführung bei Engpässen","images":["https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/evaluation-content/evaluation-content/templates/handbuch-kat-b/blicktechnik/engpass.jpg"],"categories":["B","B Schaltung","B Automatik"]}
      ]'::jsonb
    ),
    (
      'Gebiet',
      '[
        {"title":"Strassen mit verkehrsberuhigenden Massnahmen","images":["https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/evaluation-content/evaluation-content/templates/handbuch-kat-b/gebiet/tempo-30.jpg"],"categories":["B","B Schaltung","B Automatik"]}
      ]'::jsonb
    )
)
UPDATE public.evaluation_criteria ec
SET
  staff_content = CASE
    WHEN ec.staff_content IS NULL THEN jsonb_build_object('sections', img.sections)
    ELSE jsonb_set(
      ec.staff_content,
      '{sections}',
      COALESCE(ec.staff_content->'sections', '[]'::jsonb) || img.sections
    )
  END,
  updated_at = now()
FROM img
WHERE ec.name = img.name
  AND COALESCE(ec.staff_content::text, '') NOT ILIKE '%handbuch-kat-b%'
  AND (
    ec.tenant_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = ec.tenant_id AND t.business_type = 'driving_school'
    )
  );
