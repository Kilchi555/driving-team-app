-- FIX booking_reservations: Remove public policies and create authenticated ones

-- 1. Drop all public policies
DROP POLICY IF EXISTS "Allow public to create reservations" ON public.booking_reservations;
DROP POLICY IF EXISTS "Allow public to delete reservations" ON public.booking_reservations;
DROP POLICY IF EXISTS "Allow public to read reservations" ON public.booking_reservations;
DROP POLICY IF EXISTS "Allow public to update reservations" ON public.booking_reservations;
DROP POLICY IF EXISTS "Allow service role full access" ON public.booking_reservations;

-- 2. Enable RLS
ALTER TABLE public.booking_reservations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- BOOKING_RESERVATIONS: Only authenticated users (no public)
-- ============================================================================

-- SELECT: Authenticated users can see
CREATE POLICY "booking_reservations_select" ON public.booking_reservations
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Authenticated users can reserve
CREATE POLICY "booking_reservations_insert" ON public.booking_reservations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Authenticated users can update
CREATE POLICY "booking_reservations_update" ON public.booking_reservations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: Authenticated users can delete
CREATE POLICY "booking_reservations_delete" ON public.booking_reservations
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- Verify: All policies should be {authenticated}
-- ============================================================================
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  CASE WHEN roles::text LIKE '%authenticated%' THEN '✅ Secure' ELSE '❌ Problem' END as status
FROM pg_policies 
WHERE tablename IN ('appointments', 'payments', 'booking_reservations')
ORDER BY tablename, policyname;

