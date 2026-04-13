-- Vorname-Spalte zu fahrlehrer_leads hinzufügen
ALTER TABLE fahrlehrer_leads ADD COLUMN IF NOT EXISTS first_name TEXT;

COMMENT ON COLUMN fahrlehrer_leads.first_name IS 'Extrahierter Vorname für personalisierte SMS – manuell überprüfen vor dem Versand';
