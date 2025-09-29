-- Convert locations.category to array
-- Erstellt: 2024-12-19
-- Zweck: Konvertiert die category Spalte von VARCHAR zu VARCHAR[]

-- 1. Locations Tabelle erweitern um category Array-Spalte
ALTER TABLE locations ADD COLUMN IF NOT EXISTS category VARCHAR(10)[];

-- 2. Bestehende category Werte zu Array konvertieren (falls vorhanden)
UPDATE locations 
SET category = ARRAY[category]::VARCHAR(10)[]
WHERE category IS NOT NULL 
AND category != '' 
AND array_length(category::VARCHAR(10)[], 1) IS NULL;

-- 3. Erfolgs-Meldung
DO $$
BEGIN
  RAISE NOTICE '✅ Category Spalte erfolgreich zu Array konvertiert!';
  RAISE NOTICE '📊 locations.category ist jetzt VARCHAR(10)[]';
  RAISE NOTICE '🔧 Verwende p_category_code = ANY(l.category) für Queries';
END $$;
