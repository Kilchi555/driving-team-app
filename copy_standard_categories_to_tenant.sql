-- Standard Categories Templates für einen neuen Tenant kopieren
-- Ersetzen Sie 'TENANT_ID_HIER' mit der tatsächlichen Tenant-ID

-- 1. Standard-Templates für einen Tenant kopieren
INSERT INTO categories (
  name,
  description,
  code,
  color,
  is_active,
  exam_duration_minutes,
  lesson_duration_minutes,
  theory_durations,
  tenant_id
)
SELECT 
  name,
  description,
  code,
  color,
  is_active,
  exam_duration_minutes,
  lesson_duration_minutes,
  theory_durations,
  'TENANT_ID_HIER'::uuid  -- Ersetzen Sie dies mit der tatsächlichen Tenant-ID
FROM categories
WHERE tenant_id IS NULL  -- Standard-Templates (ohne tenant_id)
  AND is_active = true;

-- 2. Überprüfen, welche Categories kopiert wurden
SELECT 
  'COPIED' as status,
  name,
  code,
  color,
  exam_duration_minutes,
  lesson_duration_minutes,
  theory_durations,
  is_active
FROM categories
WHERE tenant_id = 'TENANT_ID_HIER'::uuid  -- Ersetzen Sie dies mit der tatsächlichen Tenant-ID
ORDER BY code;

-- 3. Zeige alle verfügbaren Standard-Templates
SELECT 
  'AVAILABLE_TEMPLATES' as status,
  name,
  code,
  color,
  exam_duration_minutes,
  lesson_duration_minutes,
  theory_durations,
  is_active
FROM categories
WHERE tenant_id IS NULL
ORDER BY code;
