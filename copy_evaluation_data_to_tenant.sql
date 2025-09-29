-- Kopiere Bewertungssystem-Daten für Tenant 64259d68-195a-4c68-8875-f1b44d962830
-- Erstellt neue Einträge mit tenant_id statt bestehende zu überschreiben

-- 1. Kopiere evaluation_categories (Bewertungskategorien)
-- Kopiere nur globale Kategorien (tenant_id IS NULL) für den spezifischen Tenant
INSERT INTO evaluation_categories (
  name,
  description,
  color,
  display_order,
  is_active,
  tenant_id,
  created_at,
  updated_at
)
SELECT 
  name,
  description,
  color,
  display_order,
  is_active,
  '64259d68-195a-4c68-8875-f1b44d962830'::uuid as tenant_id,
  NOW() as created_at,
  NOW() as updated_at
FROM evaluation_categories 
WHERE tenant_id IS NULL
  AND NOT EXISTS (
    -- Verhindere Duplikate: Prüfe ob bereits eine Kategorie mit gleichem Namen für diesen Tenant existiert
    SELECT 1 FROM evaluation_categories existing 
    WHERE existing.name = evaluation_categories.name 
    AND existing.tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
  );

-- 2. Kopiere evaluation_criteria (Bewertungskriterien)
-- Zuerst erstellen wir eine temporäre Tabelle für die Kategorie-Mappings
CREATE TEMP TABLE temp_category_mapping AS
SELECT 
  old.id as old_category_id,
  new.id as new_category_id
FROM evaluation_categories old
JOIN evaluation_categories new ON (
  old.name = new.name 
  AND old.tenant_id IS NULL 
  AND new.tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
);

-- Dann kopieren wir die evaluation_criteria mit den neuen Kategorie-IDs
INSERT INTO evaluation_criteria (
  category_id,
  name,
  description,
  display_order,
  is_active,
  driving_categories,
  tenant_id,
  created_at,
  updated_at
)
SELECT 
  tcm.new_category_id as category_id,
  ec.name,
  ec.description,
  ec.display_order,
  ec.is_active,
  ec.driving_categories,
  '64259d68-195a-4c68-8875-f1b44d962830'::uuid as tenant_id,
  NOW() as created_at,
  NOW() as updated_at
FROM evaluation_criteria ec
JOIN temp_category_mapping tcm ON ec.category_id = tcm.old_category_id
WHERE ec.tenant_id IS NULL
  AND NOT EXISTS (
    -- Verhindere Duplikate: Prüfe ob bereits ein Kriterium mit gleichem Namen in der neuen Kategorie existiert
    SELECT 1 FROM evaluation_criteria existing 
    JOIN evaluation_categories cat ON existing.category_id = cat.id
    WHERE existing.name = ec.name 
    AND cat.tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
  );

-- 3. Kopiere evaluation_scale (Bewertungsskala)
-- Kopiere nur globale Skala (tenant_id IS NULL) für den spezifischen Tenant
INSERT INTO evaluation_scale (
  rating,
  label,
  description,
  color,
  is_active,
  tenant_id,
  created_at
)
SELECT 
  rating,
  label,
  description,
  color,
  is_active,
  '64259d68-195a-4c68-8875-f1b44d962830'::uuid as tenant_id,
  NOW() as created_at
FROM evaluation_scale 
WHERE tenant_id IS NULL
  AND NOT EXISTS (
    -- Verhindere Duplikate: Prüfe ob bereits eine Bewertung mit gleichem Rating für diesen Tenant existiert
    SELECT 1 FROM evaluation_scale existing 
    WHERE existing.rating = evaluation_scale.rating 
    AND existing.tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
  );

-- 4. Zeige Statistiken der kopierten Daten
SELECT 'evaluation_categories' as table_name, COUNT(*) as copied_count
FROM evaluation_categories 
WHERE tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'

UNION ALL

SELECT 'evaluation_criteria' as table_name, COUNT(*) as copied_count
FROM evaluation_criteria
WHERE tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'

UNION ALL

SELECT 'evaluation_scale' as table_name, COUNT(*) as copied_count
FROM evaluation_scale
WHERE tenant_id = '64259d68-195a-4c68-8875-f1b44d962830';

-- 5. Zeige auch die ursprünglichen globalen Daten
SELECT 'global_evaluation_categories' as table_name, COUNT(*) as original_count
FROM evaluation_categories 
WHERE tenant_id IS NULL

UNION ALL

SELECT 'global_evaluation_criteria' as table_name, COUNT(*) as original_count
FROM evaluation_criteria
WHERE tenant_id IS NULL

UNION ALL

SELECT 'global_evaluation_scale' as table_name, COUNT(*) as original_count
FROM evaluation_scale
WHERE tenant_id IS NULL;

-- 6. Aufräumen
DROP TABLE temp_category_mapping;
