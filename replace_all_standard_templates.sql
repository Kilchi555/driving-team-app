-- Ersetze alle Standard-Templates durch Kopien der tenant-spezifischen Categories
-- Lösche zuerst alle bestehenden Standard-Templates und kopiere dann alle tenant-spezifischen Categories

-- 1. Zeige zuerst alle bestehenden Categories an
SELECT 'BEFORE_REPLACEMENT' as status, code, name, 
  CASE WHEN tenant_id IS NULL THEN 'STANDARD_TEMPLATE' ELSE 'TENANT_SPECIFIC' END as type,
  tenant_id
FROM categories 
ORDER BY code, type;

-- 2. Lösche alle bestehenden Standard-Templates (tenant_id IS NULL)
DELETE FROM categories WHERE tenant_id IS NULL;

-- 3. Kopiere alle tenant-spezifischen Categories als Standard-Templates
INSERT INTO categories (
  name,
  description,
  code,
  color,
  is_active,
  exam_duration_minutes,
  lesson_duration_minutes,
  theory_durations
  -- tenant_id bleibt NULL (Standard-Template)
)
SELECT DISTINCT
  name,
  description,
  code,
  color,
  is_active,
  exam_duration_minutes,
  lesson_duration_minutes,
  theory_durations
FROM categories
WHERE tenant_id IS NOT NULL;

-- 4. Zeige alle Standard-Templates nach dem Ersetzen
SELECT 
  'STANDARD_TEMPLATES_AFTER_REPLACEMENT' as status,
  id,
  name,
  description,
  code,
  color,
  exam_duration_minutes,
  lesson_duration_minutes,
  theory_durations,
  is_active,
  created_at
FROM categories 
WHERE tenant_id IS NULL 
ORDER BY code;

-- 5. Zeige alle tenant-spezifischen Categories (bleiben unverändert)
SELECT 
  'TENANT_CATEGORIES_UNCHANGED' as status,
  t.name as tenant_name,
  c.id,
  c.name,
  c.description,
  c.code,
  c.color,
  c.exam_duration_minutes,
  c.lesson_duration_minutes,
  c.theory_durations,
  c.is_active
FROM categories c
JOIN tenants t ON c.tenant_id = t.id
WHERE c.tenant_id IS NOT NULL
ORDER BY c.code, t.name;

-- 6. Zusammenfassung: Alle Codes mit Standard-Templates
SELECT 
  'FINAL_SUMMARY' as status,
  code,
  COUNT(*) as total_categories,
  COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as standard_templates,
  COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as tenant_specific
FROM categories
GROUP BY code
ORDER BY code;
