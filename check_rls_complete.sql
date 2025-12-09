-- Complete RLS check for all important tables

-- 1. Check RLS enabled status
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('appointments', 'payments', 'booking_reservations', 'payment_status_history', 'locations')
ORDER BY tablename;

-- 2. Check all existing policies
SELECT 
  tablename,
  policyname,
  permissive,
  roles
FROM pg_policies 
WHERE tablename IN ('appointments', 'payments', 'booking_reservations', 'payment_status_history', 'locations')
ORDER BY tablename, policyname;

