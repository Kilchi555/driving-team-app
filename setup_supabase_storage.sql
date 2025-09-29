-- Setup Supabase Storage für Tenant-Logos
-- Dieses Script stellt sicher, dass der Storage richtig konfiguriert ist

-- WICHTIG: Storage-Policies müssen im Supabase Dashboard eingerichtet werden!
-- Gehen Sie zu: Storage > Settings > Policies

-- 1. Storage Bucket "public" erstellen (falls nicht vorhanden)
-- Im Supabase Dashboard: Storage > Create Bucket
-- Name: "public"
-- Public: true (für öffentlichen Lesezugriff)

-- 2. Storage-Policies im Dashboard erstellen:
-- 
-- Policy 1: Public Read Access
-- - Name: "Public read access for logos"
-- - Operation: SELECT
-- - Target roles: public
-- - Policy definition: true
--
-- Policy 2: Authenticated Upload
-- - Name: "Authenticated users can upload"  
-- - Operation: INSERT
-- - Target roles: authenticated
-- - Policy definition: true
--
-- Policy 3: Authenticated Delete
-- - Name: "Authenticated users can delete"
-- - Operation: DELETE  
-- - Target roles: authenticated
-- - Policy definition: true

-- 3. Alternativ: Storage-Policies über SQL (falls verfügbar)
-- Hinweis: Diese Befehle funktionieren nur wenn das storage Schema verfügbar ist

DO $$
BEGIN
  -- Prüfe ob storage.buckets Tabelle existiert
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    
    -- Stelle sicher dass der "public" Bucket existiert
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'public', 
      'public', 
      true, 
      2097152, -- 2MB limit
      ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = true,
      file_size_limit = 2097152,
      allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      
    RAISE NOTICE 'Storage bucket "public" configured successfully';
    
  ELSE
    RAISE NOTICE 'Storage schema not available - configure manually in Supabase Dashboard';
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not configure storage automatically - use Supabase Dashboard';
END $$;

-- 3. Storage-Ordner-Struktur vorbereiten
-- (Wird automatisch beim ersten Upload erstellt)

-- 4. Bestätigung der Storage-Konfiguration
SELECT 
  '=== STORAGE SETUP ANWEISUNGEN ===' as title,
  '' as separator1,
  '1. Supabase Dashboard öffnen' as step1,
  '2. Storage > Create Bucket (falls nicht vorhanden)' as step2,
  '   - Name: "public"' as step2_detail1,
  '   - Public: true' as step2_detail2,
  '' as separator2,
  '3. Storage > Settings > Policies' as step3,
  '4. Folgende Policies erstellen:' as step4,
  '' as separator3,
  'Policy 1: "Public read access"' as policy1,
  '- Operation: SELECT, Target: public, Definition: true' as policy1_detail,
  '' as separator4,
  'Policy 2: "Authenticated upload"' as policy2,
  '- Operation: INSERT, Target: authenticated, Definition: true' as policy2_detail,
  '' as separator5,
  'Policy 3: "Authenticated delete"' as policy3,
  '- Operation: DELETE, Target: authenticated, Definition: true' as policy3_detail,
  '' as separator6,
  '5. Testen via /tenant-register' as step5;

-- 6. Prüfe ob Storage verfügbar ist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    RAISE NOTICE '✅ Storage Schema gefunden - Bucket sollte verfügbar sein';
  ELSE
    RAISE NOTICE '⚠️  Storage Schema nicht gefunden - Manuelle Konfiguration erforderlich';
  END IF;
END $$;
