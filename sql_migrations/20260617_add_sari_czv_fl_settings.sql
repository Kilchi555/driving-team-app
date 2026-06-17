-- ============================================================
-- Migration: SARI CZV/FL Integration Settings
-- Date: 2026-06-17
-- Description: Fügt CZV und FL SARI-Konfigurationsfelder hinzu.
--              Credentials werden verschlüsselt in tenant_secrets gespeichert.
--              Diese Migration verändert die bestehende VKU/PGS-Integration NICHT.
-- ============================================================

-- 1. Konfigurationsfelder für CZV und FL in tenants-Tabelle
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS sari_czv_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sari_czv_environment TEXT DEFAULT 'test' CHECK (sari_czv_environment IN ('test', 'production')),
  ADD COLUMN IF NOT EXISTS sari_fl_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sari_fl_environment TEXT DEFAULT 'test' CHECK (sari_fl_environment IN ('test', 'production'));

COMMENT ON COLUMN tenants.sari_czv_enabled IS 'SARI SOAP CoursesV3: CZV-Kursimport aktiviert';
COMMENT ON COLUMN tenants.sari_czv_environment IS 'SARI CZV Umgebung: test oder production';
COMMENT ON COLUMN tenants.sari_fl_enabled IS 'SARI SOAP CoursesV3: FL (Fahrlehrerweiterbildung) Kursimport aktiviert';
COMMENT ON COLUMN tenants.sari_fl_environment IS 'SARI FL Umgebung: test oder production';

-- 2. SARI-Import-Status auf der courses-Tabelle (für den Push-Status zu SARI)
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS sari_czv_imported BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sari_czv_imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sari_czv_external_id TEXT;

COMMENT ON COLUMN courses.sari_czv_imported IS 'Kurs wurde erfolgreich zu SARI (CZV/FL) gemeldet';
COMMENT ON COLUMN courses.sari_czv_imported_at IS 'Zeitstempel des letzten SARI-Imports';
COMMENT ON COLUMN courses.sari_czv_external_id IS 'Externe Kurs-ID bei SARI (Format: DT-{courseId})';

-- 3. 12-stellige Führerausweisnummer in course_registrations (für startImport)
--    Die bestehende faberid-Spalte enthält die 9-stellige FaberId.
--    SARI startImport benötigt die 12-stellige LicenseId (Führerausweisnummer).
ALTER TABLE course_registrations
  ADD COLUMN IF NOT EXISTS sari_license_id TEXT;

COMMENT ON COLUMN course_registrations.sari_license_id IS '12-stellige Führerausweisnummer (LicenseId) aus SARI getCustomer. Wird für SARI startImport Members.FaberId benötigt.';

-- 4. Indexes für Performance
CREATE INDEX IF NOT EXISTS idx_courses_sari_czv_imported
  ON courses (sari_czv_imported)
  WHERE sari_czv_imported = TRUE;

CREATE INDEX IF NOT EXISTS idx_courses_sari_czv_external_id
  ON courses (sari_czv_external_id)
  WHERE sari_czv_external_id IS NOT NULL;

-- 5. tenant_secrets: Neue Keys werden dynamisch gespeichert, kein Schema-Änderung nötig.
--    Folgende secret_type-Werte werden für CZV/FL verwendet:
--    - SARI_CZV_CLIENT_ID
--    - SARI_CZV_CLIENT_SECRET
--    - SARI_CZV_USERNAME
--    - SARI_CZV_PASSWORD
--    - SARI_CZV_REGISTRATION_ID
--    - SARI_FL_CLIENT_ID
--    - SARI_FL_CLIENT_SECRET
--    - SARI_FL_USERNAME
--    - SARI_FL_PASSWORD
--    - SARI_FL_REGISTRATION_ID
