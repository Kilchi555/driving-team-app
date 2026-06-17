-- ============================================================
-- Migration: Adressfelder in course_registrations
-- Date: 2026-06-17
-- Description: Fügt Strasse, Nr., PLZ und Ort zu course_registrations
--              hinzu. Wird für nicht-SARI Kurse (CZV Grundkurs etc.)
--              benötigt, wo die Adresse manuell erfasst wird.
-- ============================================================

ALTER TABLE course_registrations
  ADD COLUMN IF NOT EXISTS street         VARCHAR(255),
  ADD COLUMN IF NOT EXISTS street_nr      VARCHAR(20),
  ADD COLUMN IF NOT EXISTS zip            VARCHAR(10),
  ADD COLUMN IF NOT EXISTS city           VARCHAR(100),
  ADD COLUMN IF NOT EXISTS birthdate      DATE,
  ADD COLUMN IF NOT EXISTS license_number VARCHAR(50);

COMMENT ON COLUMN course_registrations.street          IS 'Strasse des Teilnehmers (non-SARI Anmeldung)';
COMMENT ON COLUMN course_registrations.street_nr       IS 'Hausnummer des Teilnehmers (non-SARI Anmeldung)';
COMMENT ON COLUMN course_registrations.zip             IS 'Postleitzahl des Teilnehmers (non-SARI Anmeldung)';
COMMENT ON COLUMN course_registrations.city            IS 'Ort des Teilnehmers (non-SARI Anmeldung)';
COMMENT ON COLUMN course_registrations.birthdate       IS 'Geburtsdatum des Teilnehmers (non-SARI Anmeldung)';
COMMENT ON COLUMN course_registrations.license_number  IS 'Führerausweis-Nummer des Teilnehmers (non-SARI Anmeldung)';
