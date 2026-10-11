-- Category-specific public course enrollment field modes (non-SARI).
-- Modes per field: required | optional | hidden.
-- Default JSON preserves today's non-SARI UI (all configurable fields required).
-- NULL rows are treated as defaults by the application resolver.
-- Does not reuse tenant booking_policy. Does not backfill historical registrations.
-- Not applied to SARI identity flows.

ALTER TABLE public.course_categories
  ADD COLUMN IF NOT EXISTS enrollment_fields jsonb
  DEFAULT '{"street":"required","street_nr":"required","zip":"required","city":"required","license_number":"required","birthdate":"required"}'::jsonb;

-- Backfill any NULL (if column existed without default) to the safe default.
UPDATE public.course_categories
SET enrollment_fields = '{"street":"required","street_nr":"required","zip":"required","city":"required","license_number":"required","birthdate":"required"}'::jsonb
WHERE enrollment_fields IS NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_categories_enrollment_fields_chk'
      AND conrelid = 'public.course_categories'::regclass
  ) THEN
    ALTER TABLE public.course_categories
      ADD CONSTRAINT course_categories_enrollment_fields_chk
      CHECK (
        enrollment_fields IS NULL
        OR (
          jsonb_typeof(enrollment_fields) = 'object'
          AND (enrollment_fields ? 'street')
          AND (enrollment_fields ? 'street_nr')
          AND (enrollment_fields ? 'zip')
          AND (enrollment_fields ? 'city')
          AND (enrollment_fields ? 'license_number')
          AND (enrollment_fields ? 'birthdate')
          AND (enrollment_fields->>'street') IN ('required', 'optional', 'hidden')
          AND (enrollment_fields->>'street_nr') IN ('required', 'optional', 'hidden')
          AND (enrollment_fields->>'zip') IN ('required', 'optional', 'hidden')
          AND (enrollment_fields->>'city') IN ('required', 'optional', 'hidden')
          AND (enrollment_fields->>'license_number') IN ('required', 'optional', 'hidden')
          AND (enrollment_fields->>'birthdate') IN ('required', 'optional', 'hidden')
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN public.course_categories.enrollment_fields IS
  'Non-SARI public enrollment field modes (required|optional|hidden) for street, street_nr, zip, city, license_number, birthdate. Default all required. Independent of booking_policy. Not applied to SARI identity flow.';
