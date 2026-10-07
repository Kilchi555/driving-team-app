-- Flexible course category session templates.
-- PR-only migration: do NOT auto-apply to production from this change.
-- Apply to production only AFTER the app that understands session_structure.sessions[] is deployed.
--
-- Scope: course_categories ONLY.
-- Does NOT mutate courses, course_sessions, bookings, payments, invoices, or SARI data.

-- 1) Widen total_duration_hours so UI max (10 × 12h) fits.
ALTER TABLE public.course_categories
  ALTER COLUMN total_duration_hours TYPE DECIMAL(5,2)
  USING total_duration_hours::DECIMAL(5,2);

-- 2) Drop uniform-only consistency check (incompatible with unequal templates).
ALTER TABLE public.course_categories
  DROP CONSTRAINT IF EXISTS course_categories_duration_consistency;

-- 3) Backfill missing sessions[] from existing session_count × hours_per_session.
-- Idempotent: skips rows that already have a non-empty sessions array.
UPDATE public.course_categories cc
SET session_structure = jsonb_build_object(
  'version', 1,
  'flexible', true,
  'description', (
    SELECT string_agg(round(COALESCE(cc.hours_per_session, 8.0)::numeric, 2)::text || 'h', ' + ')
    FROM generate_series(
      1,
      GREATEST(COALESCE(cc.session_count, 1), 1)
    ) AS g(i)
  ),
  'sessions', (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'duration_hours', round(COALESCE(cc.hours_per_session, 8.0)::numeric, 2)
      )
      ORDER BY g.i
    ), '[]'::jsonb)
    FROM generate_series(
      1,
      LEAST(GREATEST(COALESCE(cc.session_count, 1), 1), 10)
    ) AS g(i)
  )
),
updated_at = now()
WHERE cc.session_structure IS NULL
   OR jsonb_typeof(cc.session_structure->'sessions') IS DISTINCT FROM 'array'
   OR jsonb_array_length(COALESCE(cc.session_structure->'sessions', '[]'::jsonb)) = 0;

-- 4) Keep derived scalars aligned with template after backfill (uniform legacy only).
UPDATE public.course_categories cc
SET
  session_count = GREATEST(COALESCE(jsonb_array_length(cc.session_structure->'sessions'), cc.session_count, 1), 1),
  total_duration_hours = (
    SELECT ROUND(COALESCE(SUM((elem->>'duration_hours')::numeric), 0), 2)
    FROM jsonb_array_elements(COALESCE(cc.session_structure->'sessions', '[]'::jsonb)) AS elem
  ),
  updated_at = now()
WHERE jsonb_typeof(cc.session_structure->'sessions') = 'array'
  AND jsonb_array_length(cc.session_structure->'sessions') > 0;
