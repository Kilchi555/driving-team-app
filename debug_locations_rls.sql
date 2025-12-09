-- DEBUG: Check if RLS is blocking everything

-- 1. Überprüfe alle Policies
SELECT 
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'locations'
ORDER BY policyname;

-- 2. Versuche eine Test-Query (ohne RLS - als Admin)
SELECT COUNT(*) as total_locations FROM public.locations;

-- 3. Überprüfe wie viele Standard-Locations es gibt
SELECT COUNT(*) as standard_count FROM public.locations WHERE user_id IS NULL;

-- 4. Überprüfe wie viele Pickup-Locations es gibt
SELECT COUNT(*) as pickup_count FROM public.locations WHERE user_id IS NOT NULL;

-- 5. Zeige ein paar Beispiele
SELECT id, location_type, user_id, name, tenant_id FROM public.locations LIMIT 5;

