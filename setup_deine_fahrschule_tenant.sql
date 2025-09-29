-- Setup für "Deine Fahrschule" Tenant
-- Vervollständigt die fehlenden Informationen für den bestehenden Tenant

UPDATE tenants 
SET 
  contact_email = 'info@deine-fahrschule.ch',
  contact_phone = '+41 44 123 45 67',
  address = 'Musterstrasse 123, 8000 Zürich',
  business_type = 'driving_school',
  license_number = 'FS-2024-001',
  primary_color = '#2563EB', -- Schönes Blau
  secondary_color = '#059669', -- Grün
  logo_url = null, -- Kann später gesetzt werden
  updated_at = now()
WHERE id = '78af580f-1670-4be3-a556-250339c872fa';

-- Bestätigung der Änderungen
SELECT 
  id,
  name,
  slug,
  contact_email,
  contact_phone,
  address,
  primary_color,
  secondary_color,
  business_type,
  is_active
FROM tenants 
WHERE id = '78af580f-1670-4be3-a556-250339c872fa';

-- Test-URL für diesen Tenant
SELECT 
  '=== TEST URL für "Deine Fahrschule" ===' as info,
  'http://localhost:3000/auswahl?tenant=deine-fahrschule' as test_url,
  '' as separator,
  'Erwartetes Branding:' as branding_info,
  '- Name: Deine Fahrschule' as name,
  '- Farben: Blau (#2563EB) / Grün (#059669)' as colors,
  '- Adresse: Musterstrasse 123, 8000 Zürich' as address;
