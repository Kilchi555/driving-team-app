-- ============================================================
-- FIX: "Staff and admin can update courses" Policy
-- ============================================================
-- Diese Policy hat KEIN WITH CHECK - das blockiert alle Updates!

-- SCHRITT 1: Lösche die kaputte Policy
DROP POLICY IF EXISTS "Staff and admin can update courses" ON public.courses;

-- SCHRITT 2: Erstelle sie neu mit WITH CHECK
CREATE POLICY "Staff and admin can update courses" ON public.courses
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid() 
        AND users.tenant_id = courses.tenant_id 
        AND users.role = ANY (ARRAY['admin'::text, 'staff'::text, 'superadmin'::text])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid() 
        AND users.tenant_id = courses.tenant_id 
        AND users.role = ANY (ARRAY['admin'::text, 'staff'::text, 'superadmin'::text])
    )
  );

-- SCHRITT 3: Verifiziere dass die Policy jetzt korrekt ist
SELECT
    policyname,
    cmd,
    CASE WHEN qual IS NOT NULL THEN '✓ USING' ELSE '✗ KEIN USING' END,
    CASE WHEN with_check IS NOT NULL THEN '✓ WITH CHECK' ELSE '✗ KEIN WITH CHECK' END
FROM pg_policies
WHERE tablename = 'courses' AND cmd = 'UPDATE' AND policyname = 'Staff and admin can update courses';

-- Erwartet: Beide sollten ✓ sein!

-- ============================================================
-- ALTERNATIVE: Wenn du nur eine einzige UPDATE Policy brauchst
-- ============================================================
-- Lass mich wissen wenn du alle UPDATE Policies konsolidieren willst
-- Aktuell hast du zwei:
-- 1. "Staff and admin can update courses" (für Admin/Staff)
-- 2. "courses_tenant_update" (für Tenant-User)
--
-- Beide sind sinnvoll, aber beide brauchen WITH CHECK!

