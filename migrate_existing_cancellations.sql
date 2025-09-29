-- Migration: Bestehende gelöschte Termine mit Absage-Gründen versehen
-- Diese Migration weist bestehenden gelöschten Terminen einen Standard-Absage-Grund zu

-- 1. Finde alle gelöschten Termine ohne cancellation_reason_id
-- 2. Weise ihnen basierend auf deletion_reason einen passenden Grund zu
-- 3. Falls kein passender Grund gefunden wird, verwende "Sonstiges"

-- Zuerst schauen wir uns die bestehenden deletion_reasons an
SELECT 
  deletion_reason,
  COUNT(*) as count
FROM appointments 
WHERE deleted_at IS NOT NULL 
  AND cancellation_reason_id IS NULL
GROUP BY deletion_reason
ORDER BY count DESC;

-- Update bestehender gelöschter Termine mit passenden Absage-Gründen
UPDATE appointments 
SET cancellation_reason_id = (
  CASE 
    -- Schüler-bezogene Absagen
    WHEN deletion_reason ILIKE '%schüler%' OR deletion_reason ILIKE '%student%' 
      THEN (SELECT id FROM cancellation_reasons WHERE code = 'student_cancelled')
    
    -- Fahrlehrer-bezogene Absagen  
    WHEN deletion_reason ILIKE '%fahrlehrer%' OR deletion_reason ILIKE '%staff%' 
      THEN (SELECT id FROM cancellation_reasons WHERE code = 'staff_cancelled')
    
    -- Wetter-bezogene Absagen
    WHEN deletion_reason ILIKE '%wetter%' OR deletion_reason ILIKE '%weather%' 
      THEN (SELECT id FROM cancellation_reasons WHERE code = 'weather')
    
    -- Fahrzeug-bezogene Absagen
    WHEN deletion_reason ILIKE '%fahrzeug%' OR deletion_reason ILIKE '%vehicle%' 
      THEN (SELECT id FROM cancellation_reasons WHERE code = 'vehicle_issue')
    
    -- Notfall-bezogene Absagen
    WHEN deletion_reason ILIKE '%notfall%' OR deletion_reason ILIKE '%emergency%' 
      THEN (SELECT id FROM cancellation_reasons WHERE code = 'emergency')
    
    -- Other Event Types
    WHEN deletion_reason ILIKE '%other event type%' 
      THEN (SELECT id FROM cancellation_reasons WHERE code = 'other')
    
    -- Standard: Sonstiges
    ELSE (SELECT id FROM cancellation_reasons WHERE code = 'other')
  END
)
WHERE deleted_at IS NOT NULL 
  AND cancellation_reason_id IS NULL;

-- Überprüfe das Ergebnis
SELECT 
  cr.name_de as reason_name,
  COUNT(*) as count
FROM appointments a
JOIN cancellation_reasons cr ON a.cancellation_reason_id = cr.id
WHERE a.deleted_at IS NOT NULL
GROUP BY cr.name_de, cr.code
ORDER BY count DESC;

-- Zeige noch nicht zugewiesene Termine (falls vorhanden)
SELECT 
  id,
  title,
  deletion_reason,
  deleted_at
FROM appointments 
WHERE deleted_at IS NOT NULL 
  AND cancellation_reason_id IS NULL
LIMIT 10;
