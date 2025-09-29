-- Debug: Überprüfe User und Tenant-Zuordnung für den aktuellen User

-- 1. Suche den User mit der auth_user_id
SELECT 
  'USER_INFO' as type,
  id,
  first_name,
  last_name,
  email,
  role,
  tenant_id,
  auth_user_id,
  created_at
FROM users 
WHERE auth_user_id = '54c82b77-a758-4372-88a8-a8081b464d45';

-- 2. Falls tenant_id vorhanden, zeige Tenant-Info
SELECT 
  'TENANT_INFO' as type,
  t.id,
  t.name,
  t.created_at
FROM tenants t
WHERE t.id = (
  SELECT tenant_id 
  FROM users 
  WHERE auth_user_id = '54c82b77-a758-4372-88a8-a8081b464d45'
);

-- 3. Zeige alle Tenants (falls User keinen Tenant hat)
SELECT 
  'ALL_TENANTS' as type,
  id,
  name,
  created_at
FROM tenants
ORDER BY name;

-- 4. Zeige alle Users mit Tenant-Zuordnung
SELECT 
  'ALL_USERS_WITH_TENANTS' as type,
  u.id,
  u.first_name,
  u.last_name,
  u.role,
  u.tenant_id,
  t.name as tenant_name,
  u.auth_user_id
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
ORDER BY u.role, t.name;
