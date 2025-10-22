-- Setup für user_documents Tabelle ohne Migration
-- Startet mit sauberer Tabelle für neue Dokumente

-- 1. Erstelle die user_documents Tabelle (falls noch nicht vorhanden)
-- Das create_user_documents_table.sql Script sollte bereits ausgeführt worden sein

-- 2. Verifiziere dass die Tabelle existiert und korrekt konfiguriert ist
SELECT 
  'user_documents Tabelle Status:' as info,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_documents'
    ) THEN 'Tabelle existiert ✅'
    ELSE 'Tabelle fehlt ❌ - create_user_documents_table.sql ausführen!'
  END as status;

-- 3. Prüfe RLS Policies
SELECT 
  'RLS Policies:' as info,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'user_documents'
ORDER BY policyname;

-- 4. Prüfe Indizes
SELECT 
  'Indizes:' as info,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'user_documents'
ORDER BY indexname;

-- 5. Zeige Tabellenstruktur
SELECT 
  'Spalten:' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_documents'
ORDER BY ordinal_position;

-- 6. Optional: Füge ein Test-Dokument hinzu (zum Testen)
-- Uncomment die folgenden Zeilen wenn du ein Test-Dokument erstellen möchtest:

/*
-- Beispiel Test-Dokument (ersetze die UUIDs mit echten Werten aus deiner DB)
INSERT INTO public.user_documents (
  user_id,
  tenant_id,
  document_type,
  category_code,
  side,
  file_name,
  file_type,
  storage_path,
  title,
  description
) VALUES (
  'USER_ID_HIER_EINFÜGEN',  -- Ersetze mit echter User ID
  'TENANT_ID_HIER_EINFÜGEN', -- Ersetze mit echter Tenant ID
  'lernfahrausweis',
  'B',
  'front',
  'test_lernfahrausweis_b_front.jpg',
  'image/jpeg',
  'documents/test_lernfahrausweis_b_front.jpg',
  'Test Lernfahrausweis Kategorie B (Vorderseite)',
  'Test-Dokument zum Testen der neuen Struktur'
) ON CONFLICT (user_id, document_type, category_code, side, deleted_at) DO NOTHING;
*/

-- 7. Zeige finale Bestätigung
SELECT 
  'Setup Status:' as result,
  'user_documents Tabelle ist bereit für neue Uploads!' as message,
  NOW() as timestamp;
















