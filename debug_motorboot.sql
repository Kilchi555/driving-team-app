-- Check categories (driving categories)
SELECT 
  id, code, name, description, tenant_id
FROM categories
WHERE (tenant_id = '64259d68-195a-4c68-8875-f1b44d962830' OR tenant_id IS NULL)
  AND is_active = true
ORDER BY name;

-- Check the specific criteria
SELECT 
  id, name, category_id, driving_categories
FROM evaluation_criteria
WHERE id = '0faa56b6-69f7-444d-8816-5580c3aa63be';

-- Check all Motorboot criteria (using text[] array syntax)
SELECT 
  id, name, category_id, driving_categories, is_active
FROM evaluation_criteria
WHERE 'Motorboot' = ANY(driving_categories)
  AND tenant_id = '64259d68-195a-4c68-8875-f1b44d962830';

-- Check what driving_categories values exist
SELECT DISTINCT unnest(driving_categories) as category_code
FROM evaluation_criteria
WHERE tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
ORDER BY category_code;
