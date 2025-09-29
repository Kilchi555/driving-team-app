-- Kopiere nur evaluation_scale Daten für Tenant 64259d68-195a-4c68-8875-f1b44d962830
-- Erstellt neue Einträge mit tenant_id statt bestehende zu überschreiben

-- 1. Kopiere evaluation_scale (Bewertungsskala)
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

-- 2. Zeige Statistiken der kopierten Daten
SELECT 'evaluation_scale' as table_name, COUNT(*) as copied_count
FROM evaluation_scale
WHERE tenant_id = '64259d68-195a-4c68-8875-f1b44d962830';

-- 3. Zeige auch die ursprünglichen globalen Daten
SELECT 'global_evaluation_scale' as table_name, COUNT(*) as original_count
FROM evaluation_scale
WHERE tenant_id IS NULL;
