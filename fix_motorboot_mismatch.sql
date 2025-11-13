-- 1. Zuerst prüfen: Was ist der code der Motorboot-Kategorie?
SELECT id, code, name, description 
FROM categories 
WHERE name ILIKE '%boot%' OR name ILIKE '%motor%'
ORDER BY name;

-- 2. Update alle Kriterien von "Motorboot" auf "Boot"
UPDATE evaluation_criteria
SET driving_categories = array_replace(driving_categories, 'Motorboot', 'Boot')
WHERE 'Motorboot' = ANY(driving_categories)
  AND tenant_id = '64259d68-195a-4c68-8875-f1b44d962830';

-- 3. Prüfen ob es geklappt hat
SELECT id, name, driving_categories
FROM evaluation_criteria
WHERE 'Boot' = ANY(driving_categories)
  AND tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
LIMIT 5;
