-- Migration: Educational Content Struktur pro Fahrkategorie
-- Verschiebt bestehende Inhalte in _default und bereitet die neue Struktur vor

-- 1. Backup der aktuellen Struktur (optional, für Sicherheit)
-- CREATE TABLE IF NOT EXISTS evaluation_criteria_backup AS 
-- SELECT * FROM evaluation_criteria WHERE educational_content IS NOT NULL;

-- 2. Update: Verschiebe bestehende Inhalte nach _default
UPDATE evaluation_criteria
SET educational_content = jsonb_build_object('_default', educational_content)
WHERE educational_content IS NOT NULL
  AND educational_content->>'_default' IS NULL  -- Nur wenn noch nicht migriert
  AND jsonb_typeof(educational_content) = 'object'
  AND educational_content->>'title' IS NOT NULL;  -- Hat die alte Struktur

-- 3. Prüfung: Zeige Beispiele der neuen Struktur
SELECT 
  id, 
  name, 
  driving_categories,
  jsonb_pretty(educational_content) as content_structure
FROM evaluation_criteria
WHERE educational_content IS NOT NULL
LIMIT 3;

-- 4. Zähle migrierte Einträge
SELECT 
  COUNT(*) as total_with_content,
  COUNT(*) FILTER (WHERE educational_content->>'_default' IS NOT NULL) as migrated,
  COUNT(*) FILTER (WHERE educational_content->>'_default' IS NULL) as not_migrated
FROM evaluation_criteria
WHERE educational_content IS NOT NULL;
