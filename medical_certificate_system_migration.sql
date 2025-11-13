-- Migration: Medical Certificate Review System
-- Implementiert 3-Stufen-System für Arztzeugnis-Prüfung und Kostenerstattung
-- Date: 2025-11-12

-- ============================================
-- STUFE 1: Erweitere cancellation_reasons
-- ============================================

-- Neue Spalten für Arztzeugnis-Anforderungen und Override-Verhalten
ALTER TABLE cancellation_reasons
ADD COLUMN IF NOT EXISTS ignore_time_rules BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS force_charge_percentage INTEGER CHECK (force_charge_percentage >= 0 AND force_charge_percentage <= 100),
ADD COLUMN IF NOT EXISTS force_credit_hours BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS requires_proof BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS proof_description VARCHAR(255),
ADD COLUMN IF NOT EXISTS proof_instructions TEXT,
ADD COLUMN IF NOT EXISTS proof_deadline_days INTEGER DEFAULT 7;

-- Kommentare für Dokumentation
COMMENT ON COLUMN cancellation_reasons.ignore_time_rules IS 'Wenn true, werden zeitbasierte Policy-Rules ignoriert und force_charge_percentage verwendet';
COMMENT ON COLUMN cancellation_reasons.force_charge_percentage IS 'Erzwingt einen bestimmten Prozentsatz, unabhängig von der Zeit (nur wenn ignore_time_rules = true)';
COMMENT ON COLUMN cancellation_reasons.force_credit_hours IS 'Ob Stunden dem Fahrlehrer gutgeschrieben werden sollen';
COMMENT ON COLUMN cancellation_reasons.requires_proof IS 'Ob ein Nachweis (z.B. Arztzeugnis) erforderlich ist für Kostenerstattung';
COMMENT ON COLUMN cancellation_reasons.proof_description IS 'Kurzbeschreibung des benötigten Nachweises';
COMMENT ON COLUMN cancellation_reasons.proof_instructions IS 'Detaillierte Anweisungen für den Kunden';
COMMENT ON COLUMN cancellation_reasons.proof_deadline_days IS 'Anzahl Tage nach Absage, in denen der Nachweis eingereicht werden muss';

-- ============================================
-- STUFE 2: Erweitere appointments für Arztzeugnis-Tracking
-- ============================================

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS medical_certificate_status VARCHAR(50) DEFAULT NULL CHECK (medical_certificate_status IN ('pending', 'uploaded', 'approved', 'rejected', NULL)),
ADD COLUMN IF NOT EXISTS medical_certificate_url TEXT,
ADD COLUMN IF NOT EXISTS medical_certificate_uploaded_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS medical_certificate_reviewed_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS medical_certificate_reviewed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS medical_certificate_notes TEXT,
ADD COLUMN IF NOT EXISTS original_charge_percentage INTEGER,
ADD COLUMN IF NOT EXISTS refund_created BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS credit_created BOOLEAN DEFAULT false;

-- Kommentare
COMMENT ON COLUMN appointments.medical_certificate_status IS 'Status des Arztzeugnisses: pending (wartet auf Upload), uploaded (hochgeladen, wartet auf Prüfung), approved (genehmigt), rejected (abgelehnt)';
COMMENT ON COLUMN appointments.medical_certificate_url IS 'URL zum hochgeladenen Arztzeugnis (Cloudflare Images oder Supabase Storage)';
COMMENT ON COLUMN appointments.medical_certificate_uploaded_at IS 'Zeitpunkt des Uploads';
COMMENT ON COLUMN appointments.medical_certificate_reviewed_by IS 'Admin der das Zeugnis geprüft hat';
COMMENT ON COLUMN appointments.medical_certificate_reviewed_at IS 'Zeitpunkt der Prüfung';
COMMENT ON COLUMN appointments.medical_certificate_notes IS 'Admin-Notizen zur Prüfung';
COMMENT ON COLUMN appointments.original_charge_percentage IS 'Ursprünglicher Prozentsatz vor Arztzeugnis-Genehmigung (für Tracking)';
COMMENT ON COLUMN appointments.refund_created IS 'Ob eine Rückerstattung erstellt wurde';
COMMENT ON COLUMN appointments.credit_created IS 'Ob ein Guthaben erstellt wurde';

-- ============================================
-- STUFE 3: Konfiguriere existierende Cancellation Reasons
-- ============================================

-- STAFF-ABSAGEN: Ignorieren Zeit, immer kostenlos
UPDATE cancellation_reasons
SET 
  ignore_time_rules = true,
  force_charge_percentage = 0,
  force_credit_hours = true,
  requires_proof = false
WHERE cancellation_type = 'staff';

-- STUDENT-ABSAGEN (Krank, Unfall): Folgen Zeit-Regel, aber mit Arztzeugnis-Option
UPDATE cancellation_reasons
SET 
  ignore_time_rules = false,
  requires_proof = true,
  proof_description = 'Arztzeugnis erforderlich',
  proof_instructions = 'Für eine vollständige Kostenerstattung reichen Sie bitte innerhalb von 7 Tagen ein gültiges Arztzeugnis beim Büro ein. Nach Prüfung werden die Kosten erstattet oder als Guthaben gutgeschrieben.',
  proof_deadline_days = 7
WHERE code IN ('student_cancelled', 'unfall', 'krank')
  AND cancellation_type = 'student';

-- STUDENT-ABSAGEN (Andere Gründe): Folgen Zeit-Regel, kein Arztzeugnis möglich
UPDATE cancellation_reasons
SET 
  ignore_time_rules = false,
  requires_proof = false
WHERE code IN ('berufliche_grnde', 'private_grnde', 'other')
  AND cancellation_type = 'student';

-- ============================================
-- STUFE 4: Erstelle Indexes für Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_appointments_medical_certificate_status 
  ON appointments(medical_certificate_status) 
  WHERE medical_certificate_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_medical_certificate_uploaded 
  ON appointments(medical_certificate_uploaded_at) 
  WHERE medical_certificate_status = 'uploaded';

CREATE INDEX IF NOT EXISTS idx_appointments_cancellation_with_cert 
  ON appointments(deleted_at, cancellation_reason_id, medical_certificate_status) 
  WHERE deleted_at IS NOT NULL;

-- ============================================
-- STUFE 5: Erstelle View für Admin-Review-Dashboard
-- ============================================

CREATE OR REPLACE VIEW medical_certificate_reviews AS
SELECT 
  a.id as appointment_id,
  a.start_time,
  a.duration_minutes,
  a.status,
  a.cancellation_type,
  a.medical_certificate_status,
  a.medical_certificate_url,
  a.medical_certificate_uploaded_at,
  a.medical_certificate_notes,
  a.cancellation_charge_percentage,
  a.original_charge_percentage,
  cr.name_de as cancellation_reason,
  cr.proof_description,
  cr.proof_deadline_days,
  u.first_name as customer_first_name,
  u.last_name as customer_last_name,
  u.email as customer_email,
  u.phone as customer_phone,
  s.first_name as staff_first_name,
  s.last_name as staff_last_name,
  p.id as payment_id,
  p.total_amount_rappen,
  p.payment_status,
  p.payment_method,
  a.tenant_id,
  -- Berechne ob Deadline überschritten
  CASE 
    WHEN a.medical_certificate_status = 'pending' 
      AND a.deleted_at IS NOT NULL 
      AND cr.proof_deadline_days IS NOT NULL
      AND NOW() > (a.deleted_at + (cr.proof_deadline_days || ' days')::INTERVAL)
    THEN true
    ELSE false
  END as deadline_exceeded,
  -- Tage seit Upload
  CASE 
    WHEN a.medical_certificate_uploaded_at IS NOT NULL
    THEN EXTRACT(DAY FROM NOW() - a.medical_certificate_uploaded_at)::INTEGER
    ELSE NULL
  END as days_since_upload
FROM appointments a
LEFT JOIN cancellation_reasons cr ON cr.id = a.cancellation_reason_id
LEFT JOIN users u ON u.id = a.user_id
LEFT JOIN users s ON s.id = a.staff_id
LEFT JOIN payments p ON p.appointment_id = a.id
WHERE a.deleted_at IS NOT NULL
  AND a.medical_certificate_status IN ('pending', 'uploaded')
  AND cr.requires_proof = true
ORDER BY 
  CASE a.medical_certificate_status
    WHEN 'uploaded' THEN 1
    WHEN 'pending' THEN 2
  END,
  a.medical_certificate_uploaded_at DESC NULLS LAST;

-- Kommentar zur View
COMMENT ON VIEW medical_certificate_reviews IS 'Admin-Dashboard View für Arztzeugnis-Prüfungen. Zeigt alle Termine mit ausstehenden oder hochgeladenen Arztzeugnissen.';

-- ============================================
-- STUFE 6: Datenvalidierung
-- ============================================

-- Prüfe ob alle notwendigen Spalten existieren
DO $$
BEGIN
  -- Validiere cancellation_reasons
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cancellation_reasons' 
    AND column_name = 'requires_proof'
  ) THEN
    RAISE EXCEPTION 'Spalte requires_proof fehlt in cancellation_reasons';
  END IF;
  
  -- Validiere appointments
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' 
    AND column_name = 'medical_certificate_status'
  ) THEN
    RAISE EXCEPTION 'Spalte medical_certificate_status fehlt in appointments';
  END IF;
  
  RAISE NOTICE 'Migration erfolgreich: Alle Spalten vorhanden';
END $$;

-- ============================================
-- STUFE 7: Zeige Konfiguration
-- ============================================

SELECT 
  '=== KONFIGURIERTE CANCELLATION REASONS ===' as info;

SELECT 
  code,
  name_de,
  cancellation_type,
  ignore_time_rules,
  force_charge_percentage,
  requires_proof,
  proof_description
FROM cancellation_reasons
WHERE tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
ORDER BY cancellation_type, requires_proof DESC, code;

