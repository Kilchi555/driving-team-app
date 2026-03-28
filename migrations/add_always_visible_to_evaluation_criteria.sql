-- Migration: add always_visible to evaluation_criteria
-- Criteria with always_visible = true are shown in the learning area
-- even if the student has no evaluation for them yet.

ALTER TABLE evaluation_criteria
  ADD COLUMN IF NOT EXISTS always_visible boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN evaluation_criteria.always_visible IS
  'If true, this criterion is always shown in the student learning area, regardless of whether it has been evaluated.';
