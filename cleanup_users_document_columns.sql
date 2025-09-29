-- Cleanup: Entferne nicht mehr benötigte Dokument-Spalten aus users Tabelle
-- Jetzt da wir user_documents verwenden, sind diese Spalten obsolet

-- 1. Zuerst prüfen welche Dokument-Spalten existieren
SELECT 
  'Aktuelle Dokument-Spalten in users Tabelle:' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
  AND (
    column_name LIKE '%url%' 
    OR column_name LIKE 'lern%' 
    OR column_name LIKE 'fuehr%'
    OR column_name LIKE '%ausweis%'
    OR column_name LIKE '%license%'
    OR column_name LIKE '%dokument%'
    OR column_name LIKE '%document%'
  )
ORDER BY column_name;

-- 2. Backup-Warnung anzeigen
SELECT 
  '⚠️  WICHTIGER HINWEIS:' as warnung,
  'Stellen Sie sicher, dass alle wichtigen Dokumente bereits in user_documents migriert wurden!' as nachricht,
  'Diese Aktion löscht die Spalten PERMANENT!' as achtung;

-- 3. Sichere Löschung der obsoleten Spalten
-- Nur löschen wenn die Spalte tatsächlich existiert

-- Lernfahrausweis URLs
DO $$
BEGIN
  -- lernfahrausweis_url
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'lernfahrausweis_url'
  ) THEN
    ALTER TABLE public.users DROP COLUMN lernfahrausweis_url;
    RAISE NOTICE 'Spalte lernfahrausweis_url gelöscht';
  END IF;

  -- lernfahrausweis_back_url
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'lernfahrausweis_back_url'
  ) THEN
    ALTER TABLE public.users DROP COLUMN lernfahrausweis_back_url;
    RAISE NOTICE 'Spalte lernfahrausweis_back_url gelöscht';
  END IF;

  -- lernfahrausweis_a_url
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'lernfahrausweis_a_url'
  ) THEN
    ALTER TABLE public.users DROP COLUMN lernfahrausweis_a_url;
    RAISE NOTICE 'Spalte lernfahrausweis_a_url gelöscht';
  END IF;

  -- lernfahrausweis_a_back_url
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'lernfahrausweis_a_back_url'
  ) THEN
    ALTER TABLE public.users DROP COLUMN lernfahrausweis_a_back_url;
    RAISE NOTICE 'Spalte lernfahrausweis_a_back_url gelöscht';
  END IF;

  -- lernfahrausweis_be_url
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'lernfahrausweis_be_url'
  ) THEN
    ALTER TABLE public.users DROP COLUMN lernfahrausweis_be_url;
    RAISE NOTICE 'Spalte lernfahrausweis_be_url gelöscht';
  END IF;

  -- lernfahrausweis_be_back_url
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'lernfahrausweis_be_back_url'
  ) THEN
    ALTER TABLE public.users DROP COLUMN lernfahrausweis_be_back_url;
    RAISE NOTICE 'Spalte lernfahrausweis_be_back_url gelöscht';
  END IF;

  -- Führerschein URLs
  -- fuehrerschein_url
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'fuehrerschein_url'
  ) THEN
    ALTER TABLE public.users DROP COLUMN fuehrerschein_url;
    RAISE NOTICE 'Spalte fuehrerschein_url gelöscht';
  END IF;

  -- fuehrerschein_back_url
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'fuehrerschein_back_url'
  ) THEN
    ALTER TABLE public.users DROP COLUMN fuehrerschein_back_url;
    RAISE NOTICE 'Spalte fuehrerschein_back_url gelöscht';
  END IF;

  -- fuehrerschein_c_url
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'fuehrerschein_c_url'
  ) THEN
    ALTER TABLE public.users DROP COLUMN fuehrerschein_c_url;
    RAISE NOTICE 'Spalte fuehrerschein_c_url gelöscht';
  END IF;

  -- fuehrerschein_c_back_url
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'fuehrerschein_c_back_url'
  ) THEN
    ALTER TABLE public.users DROP COLUMN fuehrerschein_c_back_url;
    RAISE NOTICE 'Spalte fuehrerschein_c_back_url gelöscht';
  END IF;

  -- Weitere mögliche Dokument-Spalten
  -- ausweis_url
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'ausweis_url'
  ) THEN
    ALTER TABLE public.users DROP COLUMN ausweis_url;
    RAISE NOTICE 'Spalte ausweis_url gelöscht';
  END IF;

  -- ausweis_back_url
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'ausweis_back_url'
  ) THEN
    ALTER TABLE public.users DROP COLUMN ausweis_back_url;
    RAISE NOTICE 'Spalte ausweis_back_url gelöscht';
  END IF;

  -- documents (JSONB Spalte falls vorhanden)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'documents'
  ) THEN
    ALTER TABLE public.users DROP COLUMN documents;
    RAISE NOTICE 'Spalte documents (JSONB) gelöscht';
  END IF;

END $$;

-- 4. Verifiziere dass die Spalten entfernt wurden
SELECT 
  'Verbleibende Dokument-Spalten in users Tabelle:' as info,
  COALESCE(
    (SELECT string_agg(column_name, ', ' ORDER BY column_name)
     FROM information_schema.columns 
     WHERE table_schema = 'public' 
       AND table_name = 'users'
       AND (
         column_name LIKE '%url%' 
         OR column_name LIKE 'lern%' 
         OR column_name LIKE 'fuehr%'
         OR column_name LIKE '%ausweis%'
         OR column_name LIKE '%license%'
         OR column_name LIKE '%dokument%'
         OR column_name LIKE '%document%'
       )
    ),
    'Keine Dokument-Spalten mehr vorhanden ✅'
  ) as remaining_columns;

-- 5. Zeige finale Bestätigung
SELECT 
  'Cleanup Status:' as result,
  'Obsolete Dokument-Spalten wurden aus users Tabelle entfernt!' as message,
  'Alle Dokumente werden jetzt über user_documents Tabelle verwaltet.' as info,
  NOW() as timestamp;

