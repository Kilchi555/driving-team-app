-- Erstelle Standard-Templates aus allen tenant-spezifischen Categories
-- Da keine Standard-Templates existieren, können wir alle kopieren ohne Duplikat-Probleme

-- 1. Zeige alle bestehenden Categories an (sollten nur tenant-spezifische sein)
SELECT 'EXISTING_CATEGORIES' as status, code, name, 
  CASE WHEN tenant_id IS NULL THEN 'STANDARD_TEMPLATE' ELSE 'TENANT_SPECIFIC' END as type,
  tenant_id
FROM categories 
ORDER BY code, type;

-- 2. Kopiere alle tenant-spezifischen Categories als Standard-Templates
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

-- 3. Zeige alle Standard-Templates nach dem Erstellen
SELECT 
  'STANDARD_TEMPLATES_CREATED' as status,
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

-- 4. Zeige alle tenant-spezifischen Categories (bleiben unverändert)
SELECT 
  'TENANT_CATEGORIES' as status,
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

-- 5. Zusammenfassung: Alle Codes mit Standard-Templates
SELECT 
  'FINAL_SUMMARY' as status,
  code,
  COUNT(*) as total_categories,
  COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as standard_templates,
  COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as tenant_specific
FROM categories
GROUP BY code
ORDER BY code;
