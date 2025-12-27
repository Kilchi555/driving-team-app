-- Cleanup duplicate exam locations
-- Find and consolidate duplicates

-- Step 1: Find all duplicates (same name, address, location_type, tenant_id)
SELECT 
  name, 
  address, 
  tenant_id, 
  location_type,
  COUNT(*) as count,
  array_agg(id) as ids,
  array_agg(staff_ids) as staff_ids_list
FROM locations
WHERE location_type = 'exam'
GROUP BY name, address, tenant_id, location_type
HAVING COUNT(*) > 1
ORDER BY name;

-- Step 2: Consolidate staff_ids from duplicates
-- Example for Zürich-Albi... if you have 3 duplicates:
-- Find the master (earliest created or with most staff_ids)
-- Merge all staff_ids into one entry
-- Delete others

-- Generic approach: Keep the earliest created, merge all staff_ids
WITH duplicates AS (
  SELECT 
    name, 
    address, 
    tenant_id, 
    location_type,
    array_agg(id ORDER BY created_at) as ids,
    array_agg(DISTINCT jsonb_array_elements(staff_ids)::text) as all_staff_ids
  FROM locations
  WHERE location_type = 'exam'
  GROUP BY name, address, tenant_id, location_type
  HAVING COUNT(*) > 1
)
SELECT 
  name,
  address,
  ids[1] as master_id,
  ids[2:] as duplicate_ids,
  all_staff_ids
FROM duplicates;

-- Step 3: Execute the merge (CAREFULLY!)
-- For each duplicate set:
-- 1. Update the master location with merged staff_ids
-- 2. Delete the duplicates

-- Example: If you run the SELECT above and get results, 
-- for EACH group of duplicates, run:
/*
UPDATE locations 
SET staff_ids = ARRAY['staff_id_1', 'staff_id_2', 'staff_id_3']::jsonb
WHERE id = 'master_location_id';

DELETE FROM locations 
WHERE id IN ('duplicate_id_1', 'duplicate_id_2');
*/

