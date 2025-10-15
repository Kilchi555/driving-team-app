-- Add voucher_creation feature to the settings system
-- This feature controls whether customers can create custom vouchers in the shop

-- Insert the voucher_creation feature for all existing tenants
INSERT INTO tenant_settings (
  tenant_id,
  category,
  setting_key,
  setting_value,
  setting_type,
  created_at,
  updated_at
)
SELECT 
  id as tenant_id,
  'features' as category,
  'voucher_creation' as setting_key,
  '{"displayName":"Gutschein-Erstellung","description":"Ermöglicht Kunden im Shop, individuelle Gutscheine zu erstellen und zu kaufen.","icon":"🎁","sortOrder":3,"enabled":true}' as setting_value,
  'json' as setting_type,
  NOW() as created_at,
  NOW() as updated_at
FROM tenants 
WHERE is_active = true
AND id NOT IN (
  SELECT tenant_id 
  FROM tenant_settings 
  WHERE setting_key = 'voucher_creation' 
  AND category = 'features'
);

-- Verify the feature was added
SELECT 
  s.tenant_id,
  t.name as tenant_name,
  s.setting_key,
  s.setting_value,
  (s.setting_value::json->>'enabled')::boolean as enabled
FROM tenant_settings s
JOIN tenants t ON s.tenant_id = t.id
WHERE s.setting_key = 'voucher_creation'
AND s.category = 'features'
ORDER BY t.name;
