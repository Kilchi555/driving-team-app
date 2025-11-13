-- Überprüfung des aktuellen Cancellation System Status
-- Zeigt die Verbindung zwischen Policies, Reasons und deren Anwendung

-- ============================================
-- 1. Cancellation Policies (Was Sie haben)
-- ============================================
SELECT 
  'POLICIES' as category,
  cp.id,
  cp.name,
  cp.description,
  cp.applies_to,
  cp.is_active,
  cp.is_default
FROM cancellation_policies cp
ORDER BY cp.applies_to, cp.is_default DESC;

-- ============================================
-- 2. Cancellation Rules (Was fehlt!)
-- ============================================
SELECT 
  'RULES' as category,
  cr.id as rule_id,
  cp.name as policy_name,
  cr.hours_before_appointment,
  cr.charge_percentage,
  cr.credit_hours_to_instructor,
  cr.comparison_type,
  cr.exclude_sundays,
  cr.description
FROM cancellation_rules cr
JOIN cancellation_policies cp ON cp.id = cr.policy_id
ORDER BY cp.name, cr.hours_before_appointment DESC;

-- ============================================
-- 3. Cancellation Reasons (Absage-Gründe)
-- ============================================
SELECT 
  'REASONS' as category,
  code,
  name_de,
  description_de,
  is_active,
  sort_order
FROM cancellation_reasons
ORDER BY sort_order;

-- ============================================
-- 4. Wo fehlt die Verknüpfung?
-- ============================================
-- PROBLEM: Es gibt KEINE direkte Verknüpfung zwischen 
-- cancellation_reasons und cancellation_policies!

-- Aktuell:
-- ✅ cancellation_policies (z.B. "24h vorher kostenlos")
-- ✅ cancellation_reasons (z.B. "Fahrlehrer hat abgesagt")
-- ❌ KEINE Verknüpfung: Welcher Grund führt zu welcher Policy?

-- ============================================
-- 5. Beispiel: Welche Appointments wurden abgesagt?
-- ============================================
SELECT 
  a.id,
  a.start_time,
  a.status,
  a.cancellation_type,
  cr.name_de as cancellation_reason,
  a.cancellation_charge_percentage,
  a.cancellation_credit_hours,
  a.cancellation_policy_applied,
  cp.name as applied_policy_name,
  a.deletion_reason,
  a.deleted_at
FROM appointments a
LEFT JOIN cancellation_reasons cr ON cr.id = a.cancellation_reason_id
LEFT JOIN cancellation_policies cp ON cp.id = a.cancellation_policy_applied
WHERE a.deleted_at IS NOT NULL
  AND a.status = 'cancelled'
ORDER BY a.deleted_at DESC
LIMIT 10;

-- ============================================
-- 6. Fehlende Tabelle: cancellation_reason_policy_mapping
-- ============================================
-- Was Sie brauchen (existiert noch nicht):
/*
CREATE TABLE cancellation_reason_policy_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cancellation_reason_id UUID REFERENCES cancellation_reasons(id),
  cancellation_policy_id UUID REFERENCES cancellation_policies(id),
  applies_when VARCHAR(50), -- 'staff_initiated', 'student_initiated', 'always'
  override_rules JSONB, -- Optional: Überschreibt Policy-Regeln
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
*/

-- BEISPIEL-MAPPING (was Sie wollen):
-- Reason: "Fahrlehrer hat abgesagt" (< 24h)
--   → Policy: 0% charge, Stunden gutschreiben
--
-- Reason: "Schüler hat abgesagt" (< 24h)
--   → Policy: 100% charge, keine Stunden gutschreiben
--
-- Reason: "Notfall"
--   → Policy: 0% charge, Stunden gutschreiben (immer)

