-- Schritt 2: Kopiere evaluation_scale Daten
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
WHERE tenant_id IS NULL;
