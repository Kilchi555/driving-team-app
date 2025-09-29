-- Create a default tenant if none exists
-- This ensures we have at least one tenant to work with

-- 1) Check if any tenants exist
DO $$ 
DECLARE
  tenant_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO tenant_count FROM tenants;
  
  IF tenant_count = 0 THEN
    -- Create a default tenant
    INSERT INTO tenants (
      id,
      name,
      slug,
      domain,
      contact_email,
      contact_phone,
      address,
      business_type,
      license_number,
      logo_url,
      primary_color,
      secondary_color,
      timezone,
      currency,
      language,
      is_active,
      is_trial,
      trial_ends_at,
      subscription_plan,
      subscription_status,
      created_by,
      updated_by
    ) VALUES (
      gen_random_uuid(),
      'Driving Team',
      'driving-team',
      'driving-team.local',
      'info@driving-team.ch',
      '+41 44 123 45 67',
      'Musterstrasse 123, 8001 Zürich',
      'driving_school',
      'FS-2024-001',
      null,
      '#1e40af',
      '#3b82f6',
      'Europe/Zurich',
      'CHF',
      'de',
      true,
      false,
      null,
      'premium',
      'active',
      null,
      null
    );
    
    RAISE NOTICE 'Default tenant created successfully';
  ELSE
    RAISE NOTICE 'Tenants already exist: % tenants found', tenant_count;
  END IF;
END $$;

-- 2) Show the result
SELECT 
  id,
  name,
  slug,
  is_active,
  is_trial,
  subscription_plan,
  subscription_status,
  created_at
FROM tenants
ORDER BY created_at;
