-- =====================================================
-- AUDIT: Check ALL Customer-Related RLS Policies
-- =====================================================

-- 1. Check RLS status on all customer-related tables
SELECT 
  schemaname, 
  tablename, 
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'payments',
  'appointments', 
  'users',
  'bookings',
  'customer_profiles',
  'student_credits',
  'booking_reservations',
  'products',
  'product_sales',
  'customers'
)
ORDER BY tablename;

-- 2. Check ALL policies on payments table
SELECT 
  policyname, 
  tablename,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'payments'
ORDER BY policyname;

-- 3. Check ALL policies on appointments table
SELECT 
  policyname, 
  tablename,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'appointments'
ORDER BY policyname;

-- 4. Check ALL policies on users table
SELECT 
  policyname, 
  tablename,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- 5. Check ALL policies on student_credits table
SELECT 
  policyname, 
  tablename,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'student_credits'
ORDER BY policyname;

-- 6. Check ALL policies on booking_reservations table
SELECT 
  policyname, 
  tablename,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'booking_reservations'
ORDER BY policyname;

-- 7. Check ALL policies on products table
SELECT 
  policyname, 
  tablename,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'products'
ORDER BY policyname;

-- 8. Check ALL policies on product_sales table
SELECT 
  policyname, 
  tablename,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'product_sales'
ORDER BY policyname;

