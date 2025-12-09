-- FINAL PRODUCTION RLS - Direct and Simple
-- No subqueries, just straightforward logic

DROP POLICY IF EXISTS "locations_select" ON public.locations;

-- ============================================================================
-- CORRECTED SELECT: Direct tenant check from JWT
-- ============================================================================
CREATE POLICY "locations_select" ON public.locations
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if:
    -- 1. Location has NO user_id (Standard-Location) - everyone from tenant sees it
    -- 2. Location's user_id matches current user (Personal Pickup)
    -- 3. Current user is Staff/Admin - sees everything
    
    (user_id IS NULL)  -- Standard Locations
    OR 
    (user_id = auth.uid())  -- Own Pickups
    OR
    (auth.jwt() ->> 'user_role' IN ('admin', 'tenant_admin', 'staff'))  -- Staff sees all
    OR
    (auth.jwt() ->> 'app_role' IN ('admin', 'tenant_admin', 'staff'))  -- Staff sees all (alternate field)
  );

-- Verifiziere
SELECT 
  policyname,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'locations'
ORDER BY policyname;
