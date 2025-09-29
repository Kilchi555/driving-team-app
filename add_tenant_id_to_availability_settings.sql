-- Add tenant_id to availability_settings table for multi-tenant support
-- Each tenant should have their own business rules and availability settings

-- 1. Add tenant_id column
ALTER TABLE availability_settings 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- 2. Create index for tenant-based queries
CREATE INDEX IF NOT EXISTS idx_availability_settings_tenant_id ON availability_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_availability_settings_tenant_key ON availability_settings(tenant_id, setting_key);

-- 3. Update existing settings to belong to default tenant
-- (Replace with your actual default tenant ID)
UPDATE availability_settings 
SET tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
WHERE tenant_id IS NULL;

-- 4. Make tenant_id required after data migration
ALTER TABLE availability_settings 
ALTER COLUMN tenant_id SET NOT NULL;

-- 5. Create unique constraint per tenant
ALTER TABLE availability_settings 
DROP CONSTRAINT IF EXISTS availability_settings_setting_key_key;

ALTER TABLE availability_settings 
ADD CONSTRAINT availability_settings_tenant_key_unique 
UNIQUE (tenant_id, setting_key);

-- 6. Add RLS policy for tenant isolation
ALTER TABLE availability_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access settings from their tenant
CREATE POLICY availability_settings_tenant_access ON availability_settings
  FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid() AND is_active = true
    )
  );

-- 7. Copy default settings to second tenant
INSERT INTO availability_settings (setting_key, setting_value, description, tenant_id)
SELECT 
  setting_key,
  setting_value,
  description,
  '78af580f-1670-4be3-a556-250339c872fa' -- Second tenant ID
FROM availability_settings 
WHERE tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
ON CONFLICT (tenant_id, setting_key) DO NOTHING;

-- 8. Verify the migration
SELECT 
  t.name as tenant_name,
  COUNT(a.id) as settings_count,
  STRING_AGG(a.setting_key, ', ') as setting_keys
FROM tenants t
LEFT JOIN availability_settings a ON t.id = a.tenant_id
GROUP BY t.id, t.name
ORDER BY t.name;
