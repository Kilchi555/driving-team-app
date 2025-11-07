-- Fix location categories to support all driving categories
-- This ensures that locations support the categories that staff can teach

-- 1. Check current location category configuration
SELECT 
  id,
  name,
  category,
  location_type,
  tenant_id
FROM locations 
WHERE is_active = true
ORDER BY name;

-- 2. Update locations to support all common driving categories
-- Standard driving categories: A, B, BE, A1, A35, BPT, C1, C, CE, D, Motorboot
UPDATE locations 
SET category = ARRAY['A', 'B', 'BE', 'A1', 'A35', 'BPT', 'C1', 'C', 'CE', 'D', 'Motorboot']
WHERE location_type = 'standard' 
  AND is_active = true
  AND tenant_id = '64259d68-195a-4c68-8875-f1b44d962830';

-- 3. For exam locations, keep their specific categories but add common ones
UPDATE locations 
SET category = ARRAY['A', 'B', 'BE', 'A1', 'A35', 'BPT', 'C1', 'C', 'CE', 'D', 'Motorboot']
WHERE location_type = 'exam' 
  AND is_active = true
  AND tenant_id = '64259d68-195a-4c68-8875-f1b44d962830';

-- 4. Verify the update
SELECT 
  id,
  name,
  category,
  location_type,
  tenant_id
FROM locations 
WHERE is_active = true
  AND tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
ORDER BY name;

-- 5. Check if there are any staff-location combinations that should work
SELECT 
  sl.staff_id,
  u.first_name,
  u.last_name,
  sl.location_id,
  l.name as location_name,
  l.category as location_categories,
  sc.category_code as staff_category
FROM staff_locations sl
JOIN users u ON u.id = sl.staff_id
JOIN locations l ON l.id = sl.location_id
JOIN staff_categories sc ON sc.staff_id = sl.staff_id
WHERE sl.is_active = true
  AND sc.is_active = true
  AND l.is_active = true
  AND u.is_active = true
  AND u.tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
ORDER BY u.first_name, l.name, sc.category_code;
