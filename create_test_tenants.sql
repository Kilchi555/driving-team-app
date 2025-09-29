-- Test Tenants für URL-basierte Tenant-Erkennung
-- Dieses Script erstellt verschiedene Test-Tenants mit unterschiedlichen Branding-Optionen

-- 1. Test-Tenant: "Fahrschule Alpenblick"
INSERT INTO tenants (
  id,
  name, 
  slug, 
  domain,
  contact_email,
  contact_phone,
  address,
  business_type,
  primary_color,
  secondary_color,
  timezone,
  currency,
  language,
  is_active,
  is_trial,
  subscription_plan,
  subscription_status
) VALUES (
  gen_random_uuid(),
  'Fahrschule Alpenblick',
  'alpenblick',
  NULL, -- Keine Custom Domain
  'info@alpenblick-fahrschule.ch',
  '+41 44 123 45 67',
  'Bergstrasse 123, 8001 Zürich',
  'driving_school',
  '#1E40AF', -- Blau
  '#059669', -- Grün
  'Europe/Zurich',
  'CHF',
  'de',
  true,
  false,
  'premium',
  'active'
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  contact_email = EXCLUDED.contact_email,
  contact_phone = EXCLUDED.contact_phone,
  address = EXCLUDED.address;

-- 2. Test-Tenant: "Stadtfahrschule"
INSERT INTO tenants (
  id,
  name, 
  slug, 
  domain,
  contact_email,
  contact_phone,
  address,
  business_type,
  primary_color,
  secondary_color,
  timezone,
  currency,
  language,
  is_active,
  is_trial,
  subscription_plan,
  subscription_status
) VALUES (
  gen_random_uuid(),
  'Stadtfahrschule Zürich',
  'stadtfahrschule',
  NULL,
  'kontakt@stadtfahrschule.ch',
  '+41 44 987 65 43',
  'Bahnhofstrasse 456, 8001 Zürich',
  'driving_school',
  '#DC2626', -- Rot
  '#F59E0B', -- Orange
  'Europe/Zurich',
  'CHF',
  'de',
  true,
  false,
  'basic',
  'active'
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  contact_email = EXCLUDED.contact_email,
  contact_phone = EXCLUDED.contact_phone,
  address = EXCLUDED.address;

-- 3. Test-Tenant: "Fahrschule Modern" (mit Custom Domain)
INSERT INTO tenants (
  id,
  name, 
  slug, 
  domain,
  contact_email,
  contact_phone,
  address,
  business_type,
  primary_color,
  secondary_color,
  timezone,
  currency,
  language,
  is_active,
  is_trial,
  subscription_plan,
  subscription_status
) VALUES (
  gen_random_uuid(),
  'Fahrschule Modern',
  'modern',
  'modern-fahrschule.ch', -- Custom Domain
  'hello@modern-fahrschule.ch',
  '+41 44 555 77 99',
  'Technologiepark 789, 8005 Zürich',
  'driving_school',
  '#7C3AED', -- Lila
  '#10B981', -- Smaragd
  'Europe/Zurich',
  'CHF',
  'de',
  true,
  true, -- Trial
  'trial',
  'active'
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  domain = EXCLUDED.domain,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  contact_email = EXCLUDED.contact_email,
  contact_phone = EXCLUDED.contact_phone,
  address = EXCLUDED.address;

-- 4. Update existing "driving-team" tenant with proper branding
UPDATE tenants 
SET 
  primary_color = '#3B82F6',
  secondary_color = '#10B981',
  contact_email = 'info@driving-team.ch',
  contact_phone = '+41 44 123 45 67',
  address = 'Fahrschulstrasse 1, 8000 Zürich'
WHERE slug = 'driving-team';

-- Zeige alle aktiven Tenants
SELECT 
  id,
  name,
  slug,
  domain,
  primary_color,
  secondary_color,
  subscription_plan,
  is_active
FROM tenants 
WHERE is_active = true
ORDER BY name;

-- Informationen für Tests
SELECT 
  '=== TEST URLs ===' as info,
  '' as empty_line,
  'Standard Tenant:' as test1,
  'http://localhost:3000/auswahl' as url1,
  '' as empty_line2,
  'Alpenblick Tenant:' as test2,
  'http://localhost:3000/auswahl?tenant=alpenblick' as url2,
  '' as empty_line3,
  'Stadtfahrschule Tenant:' as test3,
  'http://localhost:3000/auswahl?tenant=stadtfahrschule' as url3,
  '' as empty_line4,
  'Modern Tenant:' as test4,
  'http://localhost:3000/auswahl?tenant=modern' as url4;
