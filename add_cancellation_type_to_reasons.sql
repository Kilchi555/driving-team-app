-- Migration: Add cancellation_type to cancellation_reasons table
-- Erweitert die cancellation_reasons Tabelle um cancellation_type

-- 1. Füge cancellation_type Spalte hinzu
ALTER TABLE cancellation_reasons 
ADD COLUMN IF NOT EXISTS cancellation_type VARCHAR(10) DEFAULT 'student';

-- 2. Setze cancellation_type für bestehende Gründe
UPDATE cancellation_reasons 
SET cancellation_type = 'student' 
WHERE code IN ('student_cancelled', 'weather', 'emergency', 'other');

UPDATE cancellation_reasons 
SET cancellation_type = 'staff' 
WHERE code IN ('staff_cancelled', 'vehicle_issue');

-- 3. Füge Check Constraint hinzu
ALTER TABLE cancellation_reasons 
ADD CONSTRAINT check_cancellation_type 
CHECK (cancellation_type IN ('student', 'staff'));

-- 4. Kommentar hinzufügen
COMMENT ON COLUMN cancellation_reasons.cancellation_type IS 'Für wen ist dieser Grund relevant: student oder staff';

-- 5. Index für bessere Performance
CREATE INDEX IF NOT EXISTS idx_cancellation_reasons_type ON cancellation_reasons(cancellation_type);

