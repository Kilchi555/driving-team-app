-- Überprüfe alle bestehenden Categories und deren Typ

-- 1. Alle bestehenden Codes anzeigen
SELECT 
  'ALL_CATEGORIES' as type,
  code,
  name,
  CASE 
    WHEN tenant_id IS NULL THEN 'STANDARD_TEMPLATE'
    ELSE 'TENANT_SPECIFIC'
  END as category_type,
  tenant_id,
  created_at
FROM categories 
ORDER BY code, category_type;

-- 2. Nur Standard-Templates (tenant_id IS NULL)
SELECT 
  'STANDARD_TEMPLATES_ONLY' as type,
  id,
  code,
  name,
  color,
  exam_duration_minutes,
  lesson_duration_minutes,
  theory_durations,
  is_active
FROM categories 
WHERE tenant_id IS NULL 
ORDER BY code;

-- 3. Nur tenant-spezifische Categories
SELECT 
  'TENANT_CATEGORIES_ONLY' as type,
  t.name as tenant_name,
  c.code,
  c.name,
  c.color,
  c.exam_duration_minutes,
  c.lesson_duration_minutes,
  c.theory_durations,
  c.is_active
FROM categories c
JOIN tenants t ON c.tenant_id = t.id
WHERE c.tenant_id IS NOT NULL
ORDER BY c.code, t.name;

-- 4. Codes, die nur als tenant-spezifische Categories existieren (keine Standard-Templates)
SELECT DISTINCT
  'CODES_WITHOUT_STANDARD_TEMPLATES' as type,
  c.code,
  c.name,
  COUNT(*) as tenant_count
FROM categories c
WHERE c.tenant_id IS NOT NULL
  AND c.code NOT IN (
    SELECT code FROM categories WHERE tenant_id IS NULL
  )
GROUP BY c.code, c.name
ORDER BY c.code;
