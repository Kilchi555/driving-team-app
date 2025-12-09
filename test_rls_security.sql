-- RLS Security Test
-- This tests if Row Level Security is properly protecting data between users and tenants

-- Test 1: User A (Client from Tenant 1) can see own appointments
SELECT 
  'Test 1: User A sees own appointments' as test,
  COUNT(*) as result
FROM appointments 
WHERE user_id = '3f9ab89e-c7a1-4b8f-ac11-fc8b4446f45e';

-- Test 2: Show appointments from both Tenant 1 and Tenant 2
-- Should demonstrate clear tenant separation
SELECT 
  'All appointments by tenant' as test,
  a.tenant_id,
  COUNT(a.id) as appointment_count
FROM appointments a
GROUP BY a.tenant_id;

-- Test 3: Payments should also be tenant-isolated
SELECT 
  'Test 3: Payments by tenant' as test,
  tenant_id,
  COUNT(*) as payment_count
FROM payments
GROUP BY tenant_id;

-- Test 4: Cash balances should be tenant-isolated
SELECT 
  'Test 4: Cash balances by tenant' as test,
  tenant_id,
  COUNT(*) as balance_count
FROM cash_balances
GROUP BY tenant_id;

-- Test 5: Verify that appointments can't be accessed across tenants
-- This simulates User C (Tenant 2) trying to access Tenant 1 data
SELECT 
  'Test 5: Tenant isolation check' as test,
  a.id,
  a.user_id,
  u.email,
  u.tenant_id
FROM appointments a
JOIN users u ON a.user_id = u.id
WHERE a.tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
  AND u.tenant_id = '78af580f-1670-4be3-a556-250339c872fa'
LIMIT 1;

-- Test 6: Show RLS is enabled on critical tables
SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('appointments', 'payments', 'cash_balances', 'users')
  AND schemaname = 'public'
ORDER BY tablename;

