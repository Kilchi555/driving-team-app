-- Check current RLS status for appointments and payments tables

-- 1. Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  CASE WHEN rowsecurity = true THEN '✅ RLS enabled' ELSE '❌ RLS disabled' END as status
FROM pg_tables 
WHERE tablename IN ('appointments', 'payments', 'payment_status_history', 'booking_reservations')
ORDER BY tablename;

-- 2. Check existing policies for appointments
SELECT 
  tablename,
  policyname,
  permissive,
  roles
FROM pg_policies 
WHERE tablename IN ('appointments', 'payments', 'payment_status_history', 'booking_reservations')
ORDER BY tablename, policyname;

-- 3. Show table structure to understand data
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('appointments', 'payments')
ORDER BY table_name, ordinal_position
LIMIT 20;
