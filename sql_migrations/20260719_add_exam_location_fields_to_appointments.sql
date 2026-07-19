-- Bugfix: Selecting an exam location (Prüfungsort) was being written into
-- custom_location_name/custom_location_address, the same fields used for the
-- appointment's general meeting point (Treffpunkt). This caused the exam
-- location to incorrectly overwrite/appear as the meeting point.
--
-- This migration adds dedicated columns so the exam location can be stored
-- independently from the meeting point. No existing data is modified.

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS exam_location_name text,
  ADD COLUMN IF NOT EXISTS exam_location_address text;

COMMENT ON COLUMN appointments.exam_location_name IS 'Name of the exam location (Prüfungsort) for appointment_type=exam. Independent from custom_location_name (Treffpunkt).';
COMMENT ON COLUMN appointments.exam_location_address IS 'Address of the exam location (Prüfungsort) for appointment_type=exam. Independent from custom_location_address (Treffpunkt).';
