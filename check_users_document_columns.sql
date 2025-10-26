-- Prüfe welche Dokument-Spalten in der users Tabelle existieren

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
  AND column_name LIKE '%url%'
ORDER BY column_name;

-- Zusätzlich: Prüfe alle Spalten die mit 'lern' oder 'fuehr' beginnen
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
  AND (
    column_name LIKE 'lern%' 
    OR column_name LIKE 'fuehr%'
    OR column_name LIKE '%ausweis%'
    OR column_name LIKE '%license%'
  )
ORDER BY column_name;



















