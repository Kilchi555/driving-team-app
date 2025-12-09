-- Kritische Überprüfung: Sind die User-IDs korrekt gespeichert?

-- 1. Zeige den aktuellen authentifizierten Benutzer
SELECT auth.uid() as auth_uid;

-- 2. Suche einen Client-Benutzer
SELECT 
  id,
  email,
  role,
  auth_user_id,
  is_active,
  tenant_id
FROM public.users
WHERE role = 'client'
ORDER BY created_at DESC
LIMIT 1;

-- 3. KRITISCH: Überprüfe ob auth.uid() mit users.id übereinstimmt
-- Diese Query sollte Daten zurückgeben wenn der Benutzer authentifiziert ist
SELECT 
  u.id,
  u.email,
  u.role,
  (u.id = auth.uid()) as "id_matches_auth_uid"
FROM public.users u
WHERE u.id = auth.uid()
LIMIT 1;

-- 4. Teste INSERT-Permission direkt
-- Wenn diese Query funktioniert, können Sie inserten
INSERT INTO public.locations (
  location_type,
  user_id,
  tenant_id,
  name,
  address,
  is_active
) VALUES (
  'pickup',
  auth.uid(),
  (SELECT tenant_id FROM public.users WHERE id = auth.uid() LIMIT 1),
  'RLS Test Location',
  'Test Address für RLS',
  true
)
RETURNING id, name, user_id, location_type;

-- 5. Wenn der INSERT funktioniert, kannst du diese Location lesen
SELECT id, name, user_id, location_type 
FROM public.locations 
WHERE user_id = auth.uid() 
AND location_type = 'pickup'
ORDER BY created_at DESC
LIMIT 1;

