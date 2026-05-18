-- Migration: Partial enrollment support (Teil-3-only / A1 → A35kW upgrade path)

-- 1. Course categories: allow configuring a "partial" booking option
ALTER TABLE course_categories
  ADD COLUMN IF NOT EXISTS allow_partial_enrollment BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS partial_start_position INT DEFAULT 3,
  ADD COLUMN IF NOT EXISTS partial_price_rappen INT DEFAULT 0;

COMMENT ON COLUMN course_categories.allow_partial_enrollment IS
  'If true, customers may register for only the sessions starting at partial_start_position (e.g. only Teil 3 for A1→A35kW upgrades)';
COMMENT ON COLUMN course_categories.partial_start_position IS
  'First session position included in a partial enrollment (default 3 = Teil 3)';
COMMENT ON COLUMN course_categories.partial_price_rappen IS
  'Price in Rappen for a partial (Teil-3-only) enrollment';

-- 2. Courses: flag courses that are "Teil 3 only" by design (created by SARI with 1 session)
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS is_partial_only BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN courses.is_partial_only IS
  'True when this course only contains the final session(s) of a multi-part curriculum (e.g. a SARI-created PGS course with only Teil 3)';

-- 3. Registrations: track that a registration is a partial enrollment
ALTER TABLE course_registrations
  ADD COLUMN IF NOT EXISTS is_partial_enrollment BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN course_registrations.is_partial_enrollment IS
  'True when the customer registered only for the partial (e.g. Teil 3) portion of the course';
