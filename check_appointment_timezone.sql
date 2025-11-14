-- Prüfe wie appointment times gespeichert sind
SELECT 
  id,
  start_time,
  end_time,
  -- Extract timezone info
  CASE 
    WHEN start_time::text LIKE '%+00' THEN 'UTC'
    WHEN start_time::text LIKE '%+01' THEN 'UTC+1'
    WHEN start_time::text LIKE '%+02' THEN 'UTC+2'
    ELSE 'No timezone or unknown'
  END as timezone_info,
  NOW() as current_db_time,
  NOW() AT TIME ZONE 'Europe/Zurich' as current_zurich_time
FROM appointments
WHERE start_time > NOW() - INTERVAL '1 day'
ORDER BY start_time DESC
LIMIT 5;

-- Check the data type
SELECT 
  column_name, 
  data_type, 
  datetime_precision
FROM information_schema.columns
WHERE table_name = 'appointments' 
  AND column_name IN ('start_time', 'end_time');
