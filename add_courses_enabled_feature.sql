-- Add courses_enabled feature flag for all existing tenants
-- This script adds the courses_enabled feature flag to all existing tenants

-- Insert courses_enabled feature flag for all tenants
INSERT INTO tenant_settings (tenant_id, category, setting_key, setting_value, setting_type, description)
SELECT 
  t.id as tenant_id,
  'features' as category,
  'courses_enabled' as setting_key,
  'true' as setting_value,
  'boolean' as setting_type,
  'Courses feature enabled for all business types' as description
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_settings ts 
  WHERE ts.tenant_id = t.id 
  AND ts.setting_key = 'courses_enabled'
);

-- Show which tenants got the feature flag
SELECT 
  t.name as tenant_name,
  t.business_type,
  ts.setting_key,
  ts.setting_value
FROM tenants t
LEFT JOIN tenant_settings ts ON t.id = ts.tenant_id AND ts.setting_key = 'courses_enabled'
ORDER BY t.name;















