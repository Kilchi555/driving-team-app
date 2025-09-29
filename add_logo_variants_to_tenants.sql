-- Erweitere Tenants-Tabelle um verschiedene Logo-Varianten
-- Verschiedene Logo-Formate für unterschiedliche Verwendungszwecke

-- 1. Neue Spalten für Logo-Varianten hinzufügen
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS logo_square_url TEXT, -- Quadratisches Logo (1:1) für Favicons, Profile
ADD COLUMN IF NOT EXISTS logo_wide_url TEXT;   -- Breites Logo (3:1 oder 4:1) für Header

-- 2. Bestehende logo_url umbenennen/migrieren
-- Falls bereits Logos vorhanden sind, diese als "standard" Logo beibehalten
UPDATE tenants 
SET logo_wide_url = logo_url 
WHERE logo_url IS NOT NULL AND logo_wide_url IS NULL;

-- 3. Kommentare zu den Logo-Varianten hinzufügen
COMMENT ON COLUMN tenants.logo_url IS 'Hauptlogo (wird durch logo_wide_url ersetzt)';
COMMENT ON COLUMN tenants.logo_square_url IS 'Quadratisches Logo (1:1) für Favicons, Profile, etc.';
COMMENT ON COLUMN tenants.logo_wide_url IS 'Breites Logo (3:1 oder 4:1) für Header, Banner - Hauptlogo';

-- 4. Index für bessere Performance (optional)
CREATE INDEX IF NOT EXISTS idx_tenants_logos ON tenants(logo_url, logo_square_url, logo_wide_url);

-- 5. Bestätigung der Änderungen
SELECT 
  '=== LOGO-VARIANTEN SCHEMA UPDATE ===' as title,
  '' as separator1,
  'Neue Spalten hinzugefügt:' as info,
  '✅ logo_square_url (1:1 Format)' as square,
  '✅ logo_wide_url (3:1 oder 4:1 Format)' as wide, 
  '' as separator2,
  'Verwendung:' as usage_title,
  '• Square: Favicons, Profile, Social Media' as usage_square,
  '• Wide: Header, Banner, Hauptlogo für alle Bereiche' as usage_wide;

-- 6. Zeige aktuelle Tenant-Logo-Status
SELECT 
  name,
  slug,
  CASE 
    WHEN logo_url IS NOT NULL THEN '✅' 
    ELSE '❌' 
  END as has_standard_logo,
  CASE 
    WHEN logo_square_url IS NOT NULL THEN '✅' 
    ELSE '❌' 
  END as has_square_logo,
  CASE 
    WHEN logo_wide_url IS NOT NULL THEN '✅' 
    ELSE '❌' 
  END as has_wide_logo
FROM tenants 
WHERE is_active = true
ORDER BY name;
