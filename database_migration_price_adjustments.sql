-- Appointment Price Adjustments System
-- Erstellt: 2025-01-10
-- Zweck: Ermöglicht Credit-basierte Preisanpassungen bei Terminänderungen

-- ============================================
-- 1. NEUE TABELLE: appointment_price_adjustments
-- ============================================
-- Tracking aller Preisanpassungen für Audit Trail
CREATE TABLE IF NOT EXISTS appointment_price_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  
  -- Alte Werte
  old_duration_minutes INTEGER NOT NULL,
  old_price_rappen INTEGER NOT NULL,
  
  -- Neue Werte
  new_duration_minutes INTEGER NOT NULL,
  new_price_rappen INTEGER NOT NULL,
  
  -- Berechnung
  adjustment_amount_rappen INTEGER NOT NULL, -- Differenz (kann positiv oder negativ sein)
  adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('credit', 'charge')),
  
  -- Metadata
  adjusted_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Staff der die Änderung gemacht hat
  reason TEXT, -- Optional: Grund für Änderung
  applied_to_credits BOOLEAN DEFAULT true, -- Wurde auf student_credits angewendet?
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_adjustment_type_matches_amount CHECK (
    (adjustment_type = 'credit' AND adjustment_amount_rappen < 0) OR
    (adjustment_type = 'charge' AND adjustment_amount_rappen > 0)
  )
);

-- ============================================
-- 2. NEUE SPALTEN IN appointments TABELLE
-- ============================================
-- Tracking des ursprünglichen Preises und der Gesamtanpassung
ALTER TABLE appointments 
  ADD COLUMN IF NOT EXISTS original_price_rappen INTEGER,
  ADD COLUMN IF NOT EXISTS price_adjustment_rappen INTEGER DEFAULT 0;

-- Kommentar für Dokumentation
COMMENT ON COLUMN appointments.original_price_rappen IS 'Der ursprünglich bezahlte Preis bei erster Buchung';
COMMENT ON COLUMN appointments.price_adjustment_rappen IS 'Summe aller Preisanpassungen (positiv = Nachzahlung, negativ = Gutschrift)';

-- ============================================
-- 3. INDIZES FÜR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_appointment_price_adjustments_appointment_id 
  ON appointment_price_adjustments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_price_adjustments_adjusted_by 
  ON appointment_price_adjustments(adjusted_by);
CREATE INDEX IF NOT EXISTS idx_appointment_price_adjustments_created_at 
  ON appointment_price_adjustments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_original_price 
  ON appointments(original_price_rappen) WHERE original_price_rappen IS NOT NULL;

-- ============================================
-- 4. HELPER FUNCTION: Calculate Adjustment
-- ============================================
-- Berechnet automatisch adjustment_type basierend auf amount
CREATE OR REPLACE FUNCTION calculate_adjustment_type(amount_rappen INTEGER)
RETURNS VARCHAR(20) AS $$
BEGIN
  IF amount_rappen < 0 THEN
    RETURN 'credit';
  ELSIF amount_rappen > 0 THEN
    RETURN 'charge';
  ELSE
    RETURN 'none';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 5. TRIGGER: Auto-Update appointment price_adjustment
-- ============================================
-- Automatisch price_adjustment_rappen in appointments updaten
CREATE OR REPLACE FUNCTION update_appointment_total_adjustment()
RETURNS TRIGGER AS $$
BEGIN
  -- Update die Summe aller Anpassungen für diesen Termin
  UPDATE appointments
  SET price_adjustment_rappen = (
    SELECT COALESCE(SUM(adjustment_amount_rappen), 0)
    FROM appointment_price_adjustments
    WHERE appointment_id = NEW.appointment_id
  )
  WHERE id = NEW.appointment_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_appointment_adjustment
  AFTER INSERT ON appointment_price_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION update_appointment_total_adjustment();

-- ============================================
-- 6. VIEW: Appointment Adjustment Summary
-- ============================================
-- Praktische View für Reporting
CREATE OR REPLACE VIEW appointment_adjustment_summary AS
SELECT 
  a.id AS appointment_id,
  a.user_id,
  a.staff_id,
  a.start_time,
  a.duration_minutes,
  a.original_price_rappen,
  a.price_adjustment_rappen,
  (a.original_price_rappen + COALESCE(a.price_adjustment_rappen, 0)) AS current_total_price,
  COUNT(apa.id) AS adjustment_count,
  SUM(CASE WHEN apa.adjustment_type = 'credit' THEN apa.adjustment_amount_rappen ELSE 0 END) AS total_credits,
  SUM(CASE WHEN apa.adjustment_type = 'charge' THEN apa.adjustment_amount_rappen ELSE 0 END) AS total_charges,
  MAX(apa.created_at) AS last_adjustment_date
FROM appointments a
LEFT JOIN appointment_price_adjustments apa ON a.id = apa.appointment_id
WHERE a.original_price_rappen IS NOT NULL
GROUP BY a.id, a.user_id, a.staff_id, a.start_time, a.duration_minutes, a.original_price_rappen, a.price_adjustment_rappen;

-- ============================================
-- 7. RLS POLICIES
-- ============================================
-- Enable RLS
ALTER TABLE appointment_price_adjustments ENABLE ROW LEVEL SECURITY;

-- SELECT: Staff und Admins können alle sehen, Clients nur ihre eigenen
CREATE POLICY "appointment_price_adjustments_select" ON appointment_price_adjustments
  FOR SELECT
  TO authenticated
  USING (
    -- Admin/Staff können alle sehen
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'tenant_admin', 'staff')
    )
    OR
    -- Clients können ihre eigenen sehen
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = appointment_price_adjustments.appointment_id
      AND appointments.user_id = auth.uid()
    )
  );

-- INSERT: Nur Staff und Admins können Adjustments erstellen
CREATE POLICY "appointment_price_adjustments_insert" ON appointment_price_adjustments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'tenant_admin', 'staff')
    )
  );

-- UPDATE/DELETE: Nur Admins (für Korrekturen)
CREATE POLICY "appointment_price_adjustments_update" ON appointment_price_adjustments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'tenant_admin')
    )
  );

CREATE POLICY "appointment_price_adjustments_delete" ON appointment_price_adjustments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================
-- 8. SEED DATA / BACKFILL (Optional)
-- ============================================
-- Falls du bestehende Termine migrieren willst
-- COMMENTED OUT - nur bei Bedarf ausführen
/*
UPDATE appointments
SET original_price_rappen = lesson_price_rappen
WHERE original_price_rappen IS NULL
  AND lesson_price_rappen IS NOT NULL
  AND status IN ('confirmed', 'completed');
*/

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Überprüfe ob alles korrekt erstellt wurde
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Table appointment_price_adjustments: %', 
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'appointment_price_adjustments');
  RAISE NOTICE 'New columns in appointments: original_price_rappen, price_adjustment_rappen';
  RAISE NOTICE 'View created: appointment_adjustment_summary';
  RAISE NOTICE 'RLS Policies: 4 policies created';
END $$;

