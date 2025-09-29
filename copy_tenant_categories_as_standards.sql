-- Kopiere bestehende tenant-spezifische Categories als Standard-Templates
-- Erstellt Standard-Templates (tenant_id = NULL) aus den bestehenden tenant-spezifischen Categories

-- 1. Zeige zuerst alle bestehenden Categories an
SELECT 'BEFORE_COPY' as status, code, name, 
  CASE WHEN tenant_id IS NULL THEN 'STANDARD_TEMPLATE' ELSE 'TENANT_SPECIFIC' END as type,
  tenant_id
FROM categories 
ORDER BY code, type;

-- 2. Kopiere nur tenant-spezifische Categories als Standard-Templates, die noch keine Standard-Templates haben
-- WICHTIG: Verwende DISTINCT um Duplikate zu vermeiden und prüfe auf fehlende Standard-Templates
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
  tenant_cat.name,
  tenant_cat.description,
  tenant_cat.code,
  tenant_cat.color,
  tenant_cat.is_active,
  tenant_cat.exam_duration_minutes,
  tenant_cat.lesson_duration_minutes,
  tenant_cat.theory_durations
FROM categories tenant_cat
WHERE tenant_cat.tenant_id IS NOT NULL
  AND NOT EXISTS (
    -- Nur kopieren wenn noch kein Standard-Template für diesen Code existiert
    SELECT 1 FROM categories std_cat 
    WHERE std_cat.code = tenant_cat.code 
      AND std_cat.tenant_id IS NULL
  );

-- 3. Zeige alle Standard-Templates nach dem Kopieren
SELECT 
  'STANDARD_TEMPLATES_AFTER_COPY' as status,
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

-- 5. Zusammenfassung: Codes mit Standard-Templates
SELECT 
  'SUMMARY' as status,
  code,
  COUNT(*) as total_categories,
  COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as standard_templates,
  COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as tenant_specific
FROM categories
GROUP BY code
ORDER BY code;
