-- Migration: Add transfer tracking to course_registrations
-- Allows linking a new registration back to the one it replaced (Umplanung)

ALTER TABLE course_registrations
  ADD COLUMN IF NOT EXISTS transferred_from_registration_id UUID REFERENCES course_registrations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_course_registrations_transferred_from
  ON course_registrations(transferred_from_registration_id)
  WHERE transferred_from_registration_id IS NOT NULL;
