-- Standard Categories Templates erstellen
-- Kopiert alle bestehenden Categories als Standard-Templates (ohne tenant_id)
-- Diese können dann für neue Tenants verwendet werden

-- 1. Zuerst alle bestehenden Categories als Standard-Templates kopieren (ohne tenant_id)
INSERT INTO categories (
  name,
  description,
  code,
  color,
  is_active,
  exam_duration_minutes,
  lesson_duration_minutes,
  theory_durations
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
WHERE tenant_id IS NOT NULL
  AND code NOT IN (
    -- Verhindere Duplikate - nur kopieren wenn noch kein Standard-Template existiert
    SELECT code FROM categories WHERE tenant_id IS NULL
  );

-- 2. Falls noch keine Standard-Templates existieren, erstelle die wichtigsten Kategorien
INSERT INTO categories (
  name,
  description,
  code,
  color,
  is_active,
  exam_duration_minutes,
  lesson_duration_minutes,
  theory_durations
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
  SELECT 1 FROM categories WHERE code = default_categories.code AND tenant_id IS NULL
);

-- 3. Zeige alle Standard-Templates an
SELECT 
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

-- 4. Optional: Zeige auch alle tenant-spezifischen Categories
SELECT 
  'TENANT' as type,
  t.name as tenant_name,
  c.name as category_name,
  c.code,
  c.color,
  c.exam_duration_minutes,
  c.lesson_duration_minutes,
  c.theory_durations,
  c.is_active
FROM categories c
JOIN tenants t ON c.tenant_id = t.id
WHERE c.tenant_id IS NOT NULL
ORDER BY t.name, c.code;
