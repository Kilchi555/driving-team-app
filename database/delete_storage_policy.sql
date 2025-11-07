-- Lösche eine Storage Policy
-- Ersetze 'Authenticated Upload r2c1yg_0' mit dem Namen der Policy, die du löschen möchtest

-- Policy löschen
DROP POLICY IF EXISTS "Authenticated Upload r2c1yg_0" ON storage.objects;

-- ✅ Policy wurde gelöscht (falls sie existiert)

-- 📝 Hinweis:
-- - IF EXISTS verhindert Fehler, falls die Policy nicht existiert
-- - Du kannst auch mehrere Policies auf einmal löschen:
--
-- DROP POLICY IF EXISTS "Policy Name 1" ON storage.objects;
-- DROP POLICY IF EXISTS "Policy Name 2" ON storage.objects;

