-- Cleanup: Merge duplicate Bassersdorf locations
-- Problem: Multiple entries for same location with different staff_ids

-- Step 1: Find the master location (the one with tenant_id, earliest created)
-- It should be: eee0e140-5c27-40f8-a518-433a9fac02e6 (tenant_id = 64259d68-195a-4c68-8875-f1b44d962830, created 2025-07-24)

-- Step 2: Get all staff_ids from duplicates
-- bebb6fac-5b53-4483-9148-a74592a61c9e: staff_id = 466c3c5a-1359-482a-b0b6-d82975f30b8b
-- 3395876b-0e38-4045-8043-bd6078786424: staff_id = 1c492300-d9b5-4339-8c57-ae2d7e972197
-- cc35d2be-e6a8-4861-969e-20b9ae0c12f1: staff_id = 64a167c8-8da8-42b0-9212-32dcf7bc4759

-- Step 3: Update master location with all staff_ids
UPDATE locations
SET staff_ids = '["466c3c5a-1359-482a-b0b6-d82975f30b8b", "1c492300-d9b5-4339-8c57-ae2d7e972197", "64a167c8-8da8-42b0-9212-32dcf7bc4759"]'
WHERE id = 'eee0e140-5c27-40f8-a518-433a9fac02e6';

-- Step 4: Delete duplicate entries
DELETE FROM locations
WHERE name = 'Bassersdorf' 
AND address = 'Grindelstrasse 22, 8303 Bassersdorf'
AND location_type = 'exam'
AND id IN (
  'bebb6fac-5b53-4483-9148-a74592a61c9e',
  '3395876b-0e38-4045-8043-bd6078786424',
  'cc35d2be-e6a8-4861-969e-20b9ae0c12f1'
);

-- Verification
SELECT id, name, tenant_id, staff_ids, created_at
FROM locations
WHERE name = 'Bassersdorf'
ORDER BY created_at;

