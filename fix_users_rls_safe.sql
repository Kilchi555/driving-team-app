-- Sichere RLS Policy für users Tabelle ohne Endlosschleife
-- Diese Policy erlaubt Benutzern nur Zugriff auf ihre eigenen Daten

-- 1. Entferne alle bestehenden Policies
DROP POLICY IF EXISTS "users_tenant_access" ON public.users;
DROP POLICY IF EXISTS "users_tenant_access_fixed" ON public.users;
DROP POLICY IF EXISTS "users_safe_access" ON public.users;

-- 2. Deaktiviere RLS temporär
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 3. Erstelle eine sichere Policy
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Benutzer können nur ihre eigenen Daten sehen
CREATE POLICY "users_own_data_access" ON public.users
  FOR ALL
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- 5. Policy: Service Role kann alle Daten sehen (für Admin-Operationen)
CREATE POLICY "users_service_role_access" ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. Teste die Policy
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;
