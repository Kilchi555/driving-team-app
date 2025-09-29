-- Standard-Templates erstellen (nur für tenant_id IS NULL)
-- Erstellt Standard-Templates nur für Codes, die noch keine Standard-Templates haben

-- 1. Zeige alle bestehenden Codes an
SELECT 'EXISTING_CODES' as status, code, name, 
  CASE 
    WHEN tenant_id IS NULL THEN 'STANDARD_TEMPLATE'
    ELSE 'TENANT_SPECIFIC'
  END as type,
  tenant_id 
FROM categories 
ORDER BY code, tenant_id;

-- 2. Erstelle Standard-Templates nur für Codes, die noch keine Standard-Templates haben
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
SELECT * FROM (VALUES
  ('Personenwagen', 'Führerschein für Personenwagen bis 3.5t', 'B', '#3B82F6', true, 180, ARRAY[45, 60, 90, 120, 180], 45),
  ('Motorrad', 'Führerschein für Motorräder', 'A', '#EF4444', true, 180, ARRAY[45, 60, 90], 45),
  ('Personenwagen mit Anhänger', 'Führerschein für Personenwagen mit Anhänger', 'BE', '#10B981', true, 180, ARRAY[45, 60, 90, 120, 180], 45),
  ('Beruflicher Personentransport', 'Führerschein für Taxi, Mietwagen, etc.', 'BPT', '#F59E0B', true, 180, ARRAY[45, 60, 90, 120, 180], 45),
  ('Lastwagen bis 7.5t', 'Führerschein für Lastwagen bis 7.5t', 'C1D1', '#8B5CF6', true, 180, ARRAY[45, 60, 90, 120, 180, 240], 45),
  ('Lastwagen', 'Führerschein für Lastwagen über 7.5t', 'C', '#EC4899', true, 180, ARRAY[45, 60, 90, 120, 180, 240], 45),
  ('Lastwagen mit Anhänger', 'Führerschein für Lastwagen mit Anhänger', 'CE', '#06B6D4', true, 180, ARRAY[45, 60, 90, 120, 180, 240], 45),
  ('Bus', 'Führerschein für Busse', 'D', '#84CC16', true, 180, ARRAY[45, 60, 90, 120, 180, 240, 300], 45),
  ('Motorboot', 'Führerschein für Motorboote', 'Motorboot', '#F97316', true, 120, ARRAY[45, 60, 90, 120, 180], 45)
) AS default_categories(
  name, description, code, color, is_active, exam_duration_minutes, lesson_duration_minutes, theory_durations
)
WHERE NOT EXISTS (
  -- Nur erstellen wenn noch kein Standard-Template (tenant_id IS NULL) für diesen Code existiert
  SELECT 1 FROM categories 
  WHERE code = default_categories.code 
    AND tenant_id IS NULL
);

-- 3. Zeige alle Standard-Templates an
SELECT 
  'STANDARD_TEMPLATES' as status,
  id,
  name,
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

-- 4. Zeige alle tenant-spezifischen Categories
SELECT 
  'TENANT_CATEGORIES' as status,
  t.name as tenant_name,
  c.id,
  c.name as category_name,
  c.code,
  c.color,
  c.is_active
FROM categories c
JOIN tenants t ON c.tenant_id = t.id
WHERE c.tenant_id IS NOT NULL
ORDER BY t.name, c.code;
