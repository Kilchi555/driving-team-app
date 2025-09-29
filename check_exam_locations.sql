-- Check if exam locations exist in the database
-- Run this to debug why exam locations are not loading

-- 1. Check total locations in table
SELECT COUNT(*) as total_locations FROM locations;

-- 2. Check exam locations specifically
SELECT COUNT(*) as exam_locations FROM locations WHERE location_type = 'exam';

-- 3. Check global exam locations (staff_id is null)
SELECT COUNT(*) as global_exam_locations FROM locations 
WHERE location_type = 'exam' AND staff_id IS NULL AND is_active = true;

-- 4. Show first 10 exam locations
SELECT id, name, address, location_type, staff_id, is_active, created_at 
FROM locations 
WHERE location_type = 'exam' 
ORDER BY name 
LIMIT 10;

-- 5. Check if the migration was run (look for Swiss locations)
SELECT COUNT(*) as swiss_locations FROM locations 
WHERE location_type = 'exam' 
AND (name LIKE '%Zürich%' OR name LIKE '%Bern%' OR name LIKE '%Basel%');
