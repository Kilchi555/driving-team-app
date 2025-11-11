-- Vollständiges Setup für PLZ Distance Cache mit Traffic-Zeiten
-- Führe dieses Skript in Supabase SQL Editor aus

-- 1. Erstelle Tabelle (falls noch nicht vorhanden)
CREATE TABLE IF NOT EXISTS plz_distance_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_plz VARCHAR(10) NOT NULL,
  to_plz VARCHAR(10) NOT NULL,
  driving_time_minutes INTEGER NOT NULL CHECK (driving_time_minutes > 0),
  distance_km DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(from_plz, to_plz)
);

-- 2. Füge neue Spalten hinzu (für Traffic-Zeiten)
ALTER TABLE plz_distance_cache 
ADD COLUMN IF NOT EXISTS driving_time_minutes_peak INTEGER,
ADD COLUMN IF NOT EXISTS driving_time_minutes_offpeak INTEGER,
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Kommentare für Dokumentation
COMMENT ON COLUMN plz_distance_cache.driving_time_minutes IS 'Durchschnittliche Fahrzeit (wird für Abwärtskompatibilität beibehalten)';
COMMENT ON COLUMN plz_distance_cache.driving_time_minutes_peak IS 'Fahrzeit während Stosszeiten (Mo-Fr 07:00-09:00, 17:00-19:00)';
COMMENT ON COLUMN plz_distance_cache.driving_time_minutes_offpeak IS 'Fahrzeit ausserhalb Stosszeiten';
COMMENT ON COLUMN plz_distance_cache.last_updated IS 'Letztes Update (Cache sollte nach 30 Tagen erneuert werden)';

-- 4. Migriere bestehende Daten (falls vorhanden)
UPDATE plz_distance_cache 
SET 
  driving_time_minutes_offpeak = driving_time_minutes,
  driving_time_minutes_peak = CEIL(driving_time_minutes * 1.3), -- Schätzung: +30% für Stosszeit
  last_updated = NOW()
WHERE driving_time_minutes_offpeak IS NULL;

-- 5. Index für schnellere Abfragen
CREATE INDEX IF NOT EXISTS idx_plz_distance_cache_last_updated 
ON plz_distance_cache(last_updated);

-- 6. RLS aktivieren
ALTER TABLE plz_distance_cache ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies erstellen/aktualisieren
-- Lösche alte Policies falls vorhanden
DROP POLICY IF EXISTS plz_distance_cache_read ON plz_distance_cache;
DROP POLICY IF EXISTS plz_distance_cache_write ON plz_distance_cache;
DROP POLICY IF EXISTS plz_distance_cache_insert ON plz_distance_cache;
DROP POLICY IF EXISTS plz_distance_cache_update ON plz_distance_cache;

-- Neue Policies: Alle authentifizierten User können lesen
CREATE POLICY plz_distance_cache_select ON plz_distance_cache
  FOR SELECT TO authenticated
  USING (true);

-- Service Role kann alles (für Server-Side API Calls)
CREATE POLICY plz_distance_cache_insert ON plz_distance_cache
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY plz_distance_cache_update ON plz_distance_cache
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- 8. Zeige Ergebnis
SELECT 
  COUNT(*) as total_entries,
  COUNT(CASE WHEN driving_time_minutes_peak IS NOT NULL THEN 1 END) as with_peak_data,
  COUNT(CASE WHEN driving_time_minutes_offpeak IS NOT NULL THEN 1 END) as with_offpeak_data
FROM plz_distance_cache;

-- 9. Zeige erste 5 Einträge (falls vorhanden)
SELECT 
  from_plz,
  to_plz,
  driving_time_minutes_offpeak as "Offpeak (Min)",
  driving_time_minutes_peak as "Peak (Min)",
  distance_km as "Distanz (km)",
  last_updated
FROM plz_distance_cache
ORDER BY last_updated DESC
LIMIT 5;

