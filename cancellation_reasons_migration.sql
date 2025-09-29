-- Migration: Cancellation Reasons System
-- Erstellt eine neue Tabelle für vordefinierte Absage-Gründe und erweitert das bestehende Soft-Delete System

-- 1. Erstelle cancellation_reasons Tabelle
CREATE TABLE IF NOT EXISTS cancellation_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name_de VARCHAR(100) NOT NULL,
  description_de TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Füge 6 vordefinierte Absage-Gründe ein
INSERT INTO cancellation_reasons (code, name_de, description_de, sort_order) VALUES
('student_cancelled', 'Schüler hat abgesagt', 'Der Schüler hat den Termin selbst abgesagt', 1),
('staff_cancelled', 'Fahrlehrer hat abgesagt', 'Der Fahrlehrer musste den Termin absagen', 2),
('weather', 'Schlechtes Wetter', 'Termin aufgrund von schlechtem Wetter abgesagt', 3),
('vehicle_issue', 'Fahrzeugproblem', 'Termin aufgrund von Fahrzeugproblemen abgesagt', 4),
('emergency', 'Notfall', 'Termin aufgrund eines Notfalls abgesagt', 5),
('other', 'Sonstiges', 'Termin aus anderen Gründen abgesagt', 6)
ON CONFLICT (code) DO NOTHING;

-- 3. Erweitere appointments Tabelle um cancellation_reason_id
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS cancellation_reason_id UUID REFERENCES cancellation_reasons(id);

-- 4. Erstelle Index für bessere Performance
CREATE INDEX IF NOT EXISTS idx_appointments_cancellation_reason_id ON appointments(cancellation_reason_id);
CREATE INDEX IF NOT EXISTS idx_appointments_deleted_at_reason ON appointments(deleted_at, cancellation_reason_id);

-- 5. Erstelle RLS Policies für cancellation_reasons
ALTER TABLE cancellation_reasons ENABLE ROW LEVEL SECURITY;

-- Policy: Alle können cancellation_reasons lesen
CREATE POLICY "cancellation_reasons_select_policy" ON cancellation_reasons
  FOR SELECT USING (true);

-- Policy: Nur Admins können cancellation_reasons verwalten
CREATE POLICY "cancellation_reasons_admin_policy" ON cancellation_reasons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 6. Kommentare für Dokumentation
COMMENT ON TABLE cancellation_reasons IS 'Vordefinierte Gründe für Termin-Absagen';
COMMENT ON COLUMN cancellation_reasons.code IS 'Eindeutiger Code für den Absage-Grund';
COMMENT ON COLUMN cancellation_reasons.name_de IS 'Deutscher Name des Absage-Grundes';
COMMENT ON COLUMN cancellation_reasons.description_de IS 'Deutsche Beschreibung des Absage-Grundes';
COMMENT ON COLUMN cancellation_reasons.is_active IS 'Ob der Absage-Grund aktiv ist';
COMMENT ON COLUMN cancellation_reasons.sort_order IS 'Reihenfolge für die Anzeige';

COMMENT ON COLUMN appointments.cancellation_reason_id IS 'Referenz zum Absage-Grund (optional)';

-- 7. Update Trigger für updated_at
CREATE OR REPLACE FUNCTION update_cancellation_reasons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cancellation_reasons_updated_at
  BEFORE UPDATE ON cancellation_reasons
  FOR EACH ROW
  EXECUTE FUNCTION update_cancellation_reasons_updated_at();
