-- Migration: Neue Felder für Tenant-Registrierung
-- Fügt alle zusätzlichen Felder hinzu, die beim Onboarding gesammelt werden

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS uid_number          TEXT,                    -- MwSt-/UID-Nummer (z.B. CHE-123.456.789)
  ADD COLUMN IF NOT EXISTS iban                TEXT,                    -- IBAN für Zahlungen
  ADD COLUMN IF NOT EXISTS bank_name           TEXT,                    -- Bankname
  ADD COLUMN IF NOT EXISTS website_url         TEXT,                    -- Öffentliche Website
  ADD COLUMN IF NOT EXISTS staff_count         INTEGER,                 -- Anzahl Fahrlehrer
  ADD COLUMN IF NOT EXISTS instagram_url       TEXT,                    -- Instagram-Link
  ADD COLUMN IF NOT EXISTS facebook_url        TEXT,                    -- Facebook-Link
  ADD COLUMN IF NOT EXISTS selected_categories TEXT[],                  -- Gewählte Fahrkategorien (z.B. {'B','BE','A'})
  ADD COLUMN IF NOT EXISTS working_days_template JSONB;                 -- Standard-Betriebszeiten-Template

-- Bereits vorhandene Spalten (kein ADD COLUMN nötig, nur zur Dokumentation):
-- language       TEXT  DEFAULT 'de'
-- timezone       TEXT  DEFAULT 'Europe/Zurich'
-- accent_color   TEXT

COMMENT ON COLUMN tenants.uid_number           IS 'MwSt-/UID-Nummer des Unternehmens (z.B. CHE-123.456.789 MWST)';
COMMENT ON COLUMN tenants.iban                 IS 'IBAN-Konto für Zahlungseingänge';
COMMENT ON COLUMN tenants.bank_name            IS 'Name der Bank';
COMMENT ON COLUMN tenants.website_url          IS 'Öffentliche Website-URL des Unternehmens';
COMMENT ON COLUMN tenants.staff_count          IS 'Anzahl der aktiven Fahrlehrer';
COMMENT ON COLUMN tenants.instagram_url        IS 'Instagram-Profil-URL';
COMMENT ON COLUMN tenants.facebook_url         IS 'Facebook-Seiten-URL';
COMMENT ON COLUMN tenants.selected_categories  IS 'Beim Onboarding gewählte Fahrkategorien (Codes)';
COMMENT ON COLUMN tenants.working_days_template IS 'Standard-Betriebszeiten-Template: {days:[1-7], start_time:"HH:MM", end_time:"HH:MM"}';
