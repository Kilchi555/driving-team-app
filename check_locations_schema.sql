-- Check locations table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'locations'
ORDER BY ordinal_position;
