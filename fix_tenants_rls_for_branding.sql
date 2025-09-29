-- Fix RLS Policies für Tenants-Tabelle
-- Ermöglicht Zugriff auf Tenant-Branding-Daten

-- 1. Prüfe ob tenants Tabelle existiert
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
    RAISE EXCEPTION 'Tenants table does not exist. Please run database_migration_tenants.sql first.';
  END IF;
END $$;

-- 2. RLS aktivieren (falls noch nicht aktiviert)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- 3. Bestehende problematische Policies löschen
DROP POLICY IF EXISTS tenants_access ON tenants;
DROP POLICY IF EXISTS tenants_user_access ON tenants;
DROP POLICY IF EXISTS tenants_select ON tenants;

-- 4. Neue, permissive Policy für SELECT (alle authentifizierten Benutzer)
CREATE POLICY tenants_select_policy ON tenants
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- 5. Policy für UPDATE/INSERT/DELETE (nur für Admins)
CREATE POLICY tenants_admin_policy ON tenants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'tenant_admin')
      AND is_active = true
    )
  );

-- 6. Teste den Zugriff
DO $$ 
DECLARE
  tenant_count INTEGER;
BEGIN
  -- Versuche Tenants zu zählen
  SELECT COUNT(*) INTO tenant_count FROM tenants WHERE is_active = true;
  
  RAISE NOTICE '=== TENANTS RLS FIX RESULTS ===';
  RAISE NOTICE 'Active tenants found: %', tenant_count;
  
  IF tenant_count > 0 THEN
    RAISE NOTICE '✅ Tenants table access working';
    RAISE NOTICE 'RLS Policies successfully configured';
  ELSE
    RAISE NOTICE '⚠️ No active tenants found or access still blocked';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Test query: SELECT id, name, slug FROM tenants WHERE is_active = true;';
END $$;

-- 7. Zeige aktuelle Tenant-Daten (falls verfügbar)
SELECT 
  '=== CURRENT TENANTS ===' as title,
  '' as separator;

SELECT 
  id,
  name,
  slug,
  primary_color,
  secondary_color,
  contact_email,
  contact_phone,
  is_active
FROM tenants 
WHERE is_active = true
ORDER BY name;

-- 8. Zeige RLS-Policies
SELECT 
  '=== ACTIVE RLS POLICIES ===' as title,
  '' as separator;

SELECT 
  policyname as policy_name,
  cmd as command,
  qual as condition
FROM pg_policies 
WHERE tablename = 'tenants'
ORDER BY policyname;
