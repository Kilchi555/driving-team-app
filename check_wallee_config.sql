-- Check Wallee configuration for the tenant
SELECT 
  id,
  name,
  slug
FROM tenants
WHERE id = '64259d68-195a-4c68-8875-f1b44d962830'
LIMIT 1;

-- Check tenant_secrets for Wallee config
SELECT 
  secret_type,
  secret_value
FROM tenant_secrets
WHERE tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
  AND secret_type LIKE 'WALLEE%'
ORDER BY secret_type;

