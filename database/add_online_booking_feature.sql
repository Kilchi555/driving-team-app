-- Add "Online-Terminbuchung" feature setting
-- This allows admins to enable/disable online booking functionality

-- Insert feature definition for all existing tenants
INSERT INTO tenant_settings (tenant_id, category, setting_key, setting_value, setting_type)
SELECT 
  id as tenant_id,
  'features' as category,
  'allow_online_booking' as setting_key,
  json_build_object(
    'displayName', 'Online-Terminbuchung',
    'description', 'Ermöglicht es Kunden, Termine online zu buchen. Wenn deaktiviert, können nur Mitarbeiter Termine erstellen.',
    'icon', '📅',
    'sortOrder', 1,
    'enabled', true
  )::text as setting_value,
  'json' as setting_type
FROM tenants
WHERE is_active = true
ON CONFLICT (tenant_id, category, setting_key) 
DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = NOW();

COMMENT ON TABLE tenant_settings IS 'Tenant-Einstellungen - Features wie Online-Terminbuchung können hier verwaltet werden';

