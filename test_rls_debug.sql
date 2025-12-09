-- RLS Debug-Queries für locations table
-- Führe diese Queries einzeln aus um zu testen

-- 1. Überprüfe den aktuellen Benutzer
SELECT auth.uid() as current_user_id;

-- 2. Finde einen Test-Benutzer (Client)
SELECT id, auth_user_id, email, role, tenant_id, is_active 
FROM public.users 
WHERE role = 'client' 
AND is_active = true
LIMIT 1;

-- 3. Überprüfe welchen Tenant der User hat
SELECT 
  u.id,
  u.email,
  u.role,
  u.tenant_id,
  t.name as tenant_name
FROM public.users u
LEFT JOIN public.tenants t ON u.tenant_id = t.id
WHERE u.role = 'client' 
AND u.is_active = true
LIMIT 1;

-- 4. Teste die RLS-Bedingung: Kann dieser User Locations lesen?
-- (Dieser Query wird als der User ausgeführt, nicht als Admin)
-- Ersetze <USER_ID> mit der ID aus Query 2
-- SELECT * FROM public.locations WHERE user_id = '<USER_ID>' LIMIT 5;

-- 5. Teste INSERT-Permission durch das Policy zu simulieren
-- Diese Query zeigt ob die INSERT-Policy für einen Client erfolgreich wäre
SELECT 
  'INSERT TEST' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.users 
      WHERE id IN (SELECT id FROM public.users LIMIT 1)
      AND role IN ('admin', 'tenant_admin', 'staff')
      AND is_active = true
    ) THEN 'PASS: Is Admin/Staff/TenantAdmin'
    WHEN 'pickup' = 'pickup'
      AND (SELECT id FROM public.users WHERE role = 'client' LIMIT 1) IS NOT NULL
    THEN 'PASS: Is Client creating pickup location'
    ELSE 'FAIL: Policy would block this'
  END as result;

-- 6. Zeige alle Columns der locations Tabelle
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'locations'
ORDER BY ordinal_position;

-- 7. Überprüfe ob tenant_id und user_id korrekt gesetzt sind
SELECT 
  id,
  name,
  location_type,
  user_id,
  staff_ids,
  tenant_id,
  is_active,
  created_at
FROM public.locations
WHERE location_type = 'pickup'
ORDER BY created_at DESC
LIMIT 5;

