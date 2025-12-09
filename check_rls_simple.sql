-- Simple check: RLS status and policies

-- 1. RLS Status
SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('appointments', 'payments', 'booking_reservations')
ORDER BY tablename;

-- 2. Existing policies
SELECT 
  tablename,
  policyname,
  permissive,
  roles
FROM pg_policies 
WHERE tablename IN ('appointments', 'payments', 'booking_reservations')
ORDER BY tablename;
