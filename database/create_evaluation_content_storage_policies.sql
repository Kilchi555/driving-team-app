-- Storage Policies für evaluation-content Bucket
-- ⚠️ WICHTIG: Erstelle zuerst den Bucket "evaluation-content" im Supabase Dashboard!
-- Dann führe diesen SQL-Code aus, um die Policies zu erstellen.

-- Lösche alte/konfliktreiche Policies (falls vorhanden)
DROP POLICY IF EXISTS "Authenticated Upload r2c1yg_0" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload evaluation content" ON storage.objects;
DROP POLICY IF EXISTS "Public can view evaluation content images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update evaluation content" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete evaluation content" ON storage.objects;

-- 1. Public Access Policy (für SELECT/READ - damit Bilder öffentlich angezeigt werden können)
CREATE POLICY "Public can view evaluation content images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'evaluation-content'::text
);

-- 2. Admin Upload Policy (nur Admins dürfen hochladen)
CREATE POLICY "Admins can upload evaluation content"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'evaluation-content'::text
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid()
    AND users.role = 'admin'
  )
);

-- 3. Admin Update Policy (nur Admins dürfen aktualisieren)
CREATE POLICY "Admins can update evaluation content"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'evaluation-content'::text
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid()
    AND users.role = 'admin'
  )
);

-- 4. Admin Delete Policy (nur Admins dürfen löschen)
CREATE POLICY "Admins can delete evaluation content"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'evaluation-content'::text
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid()
    AND users.role = 'admin'
  )
);

-- ✅ Fertig! Die Policies wurden erstellt.

-- 📝 Erklärung:
-- - `bucket_id = 'evaluation-content'::text` filtert nur Objekte aus dem evaluation-content Bucket
-- - `::text` ist PostgreSQL Type-Casting (stellt sicher, dass der String als TEXT behandelt wird)
-- - `auth.role() = 'authenticated'` stellt sicher, dass nur angemeldete User schreiben/löschen können
-- - Public SELECT ermöglicht es allen (auch nicht-angemeldeten Usern), Bilder anzuzeigen

