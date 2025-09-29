-- Debug: Überprüfe Tenant-Zuordnungen und Categories

-- 1. Zeige alle Tenants
SELECT 'TENANTS' as type, id, name, created_at FROM tenants ORDER BY name;

-- 2. Zeige alle Categories mit Tenant-Info
SELECT 
  'CATEGORIES_WITH_TENANTS' as type,
  c.id,
  c.code,
  c.name,
  c.tenant_id,
  CASE 
    WHEN c.tenant_id IS NULL THEN 'STANDARD_TEMPLATE'
    ELSE t.name
  END as tenant_name,
  c.created_at
FROM categories c
LEFT JOIN tenants t ON c.tenant_id = t.id
ORDER BY c.tenant_id, c.code;

-- 3. Zeige alle Users mit Tenant-Zuordnung
SELECT 
  'USERS_WITH_TENANTS' as type,
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

-- 4. Zähle Categories pro Tenant
SELECT 
  'CATEGORIES_PER_TENANT' as type,
  CASE 
    WHEN tenant_id IS NULL THEN 'STANDARD_TEMPLATES'
    ELSE (SELECT name FROM tenants WHERE id = categories.tenant_id)
  END as tenant_name,
  tenant_id,
  COUNT(*) as category_count,
  array_agg(code ORDER BY code) as codes
FROM categories
GROUP BY tenant_id
ORDER BY tenant_id;
