-- Erweitere plz_distance_cache um Traffic-Zeiten
-- Speichert sowohl normale Fahrzeit als auch Stosszeit-Fahrzeit

-- Füge neue Spalten hinzu
ALTER TABLE plz_distance_cache 
ADD COLUMN IF NOT EXISTS driving_time_minutes_peak INTEGER,
ADD COLUMN IF NOT EXISTS driving_time_minutes_offpeak INTEGER,
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Kommentar für Dokumentation
COMMENT ON COLUMN plz_distance_cache.driving_time_minutes IS 'Durchschnittliche Fahrzeit (wird für Abwärtskompatibilität beibehalten)';
COMMENT ON COLUMN plz_distance_cache.driving_time_minutes_peak IS 'Fahrzeit während Stosszeiten (Mo-Fr 07:00-09:00, 17:00-19:00)';
COMMENT ON COLUMN plz_distance_cache.driving_time_minutes_offpeak IS 'Fahrzeit ausserhalb Stosszeiten';
COMMENT ON COLUMN plz_distance_cache.last_updated IS 'Letztes Update (Cache sollte nach 30 Tagen erneuert werden)';

-- Migriere bestehende Daten: setze driving_time_minutes als offpeak
UPDATE plz_distance_cache 
SET 
  driving_time_minutes_offpeak = driving_time_minutes,
  driving_time_minutes_peak = CEIL(driving_time_minutes * 1.3), -- Schätzung: +30% für Stosszeit
  last_updated = NOW()
WHERE driving_time_minutes_offpeak IS NULL;

-- Index für schnellere Abfragen
CREATE INDEX IF NOT EXISTS idx_plz_distance_cache_last_updated 
ON plz_distance_cache(last_updated);

-- Zeige Ergebnis
SELECT 
  from_plz,
  to_plz,
  driving_time_minutes_offpeak as "Offpeak (Min)",
  driving_time_minutes_peak as "Peak (Min)",
  distance_km as "Distanz (km)",
  last_updated
FROM plz_distance_cache
ORDER BY from_plz, to_plz
LIMIT 10;

