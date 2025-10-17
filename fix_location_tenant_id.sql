-- ============================================
-- Fix: Location hat keinen tenant_id
-- ============================================

-- 1. Check: Welche Locations haben keinen tenant_id?
SELECT 
  id,
  name,
  address,
  staff_id,
  tenant_id,
  is_active
FROM locations
WHERE tenant_id IS NULL
ORDER BY created_at DESC;

-- 2. Update: Setze tenant_id basierend auf staff_id
-- Wenn staff_id gesetzt ist, nimm den tenant_id des Staff-Members
UPDATE locations
SET tenant_id = (
  SELECT tenant_id 
  FROM users 
  WHERE users.id = locations.staff_id
  LIMIT 1
)
WHERE tenant_id IS NULL 
  AND staff_id IS NOT NULL;

-- 3. Für global Locations (ohne staff_id): Manuell zuweisen
-- Prüfe erst, ob es welche gibt
SELECT 
  id,
  name,
  address,
  staff_id,
  tenant_id
FROM locations
WHERE tenant_id IS NULL 
  AND staff_id IS NULL;

-- 4. Wenn es global Locations ohne tenant_id gibt, setze einen default tenant
-- (nur ausführen wenn du einen default tenant hast)
-- UPDATE locations
-- SET tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'  -- Dein Driving Team tenant
-- WHERE tenant_id IS NULL;

-- 5. Verify: Alle Locations sollten jetzt einen tenant_id haben
SELECT 
  COUNT(*) FILTER (WHERE tenant_id IS NULL) as locations_without_tenant,
  COUNT(*) FILTER (WHERE tenant_id IS NOT NULL) as locations_with_tenant,
  COUNT(*) as total_locations
FROM locations;

-- 6. Show the fixed location
SELECT 
  id,
  name,
  address,
  staff_id,
  tenant_id,
  is_active
FROM locations
WHERE id = 'c70dc269-abff-465c-a028-d6c433529dad';

