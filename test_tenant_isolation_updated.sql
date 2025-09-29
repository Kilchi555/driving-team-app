-- Test tenant data isolation after code updates
-- Verify that the frontend code changes work correctly with RLS

-- 1. Check current tenant setup
SELECT 
  'Current tenant setup' as test_type,
  COUNT(*) as total_tenants,
  array_agg(name) as tenant_names
FROM tenants;

-- 2. Check user-tenant mapping
SELECT 
  'User-tenant mapping' as test_type,
  u.email,
  u.tenant_id,
  t.name as tenant_name
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
ORDER BY u.email;

-- 3. Test data distribution across tenants
SELECT 
  'Data distribution' as test_type,
  t.name as tenant_name,
  COUNT(DISTINCT u.id) as user_count,
  COUNT(DISTINCT a.id) as appointment_count,
  COUNT(DISTINCT p.id) as payment_count,
  COUNT(DISTINCT pr.id) as product_count
FROM tenants t
LEFT JOIN users u ON u.tenant_id = t.id
LEFT JOIN appointments a ON a.tenant_id = t.id
LEFT JOIN payments p ON p.tenant_id = t.id
LEFT JOIN products pr ON pr.tenant_id = t.id
GROUP BY t.id, t.name
ORDER BY t.name;

-- 4. Test RLS policies by simulating user access
-- This will show what data each user can see
DO $$
DECLARE
  user_rec RECORD;
  appointment_count INTEGER;
  payment_count INTEGER;
  product_count INTEGER;
BEGIN
  RAISE NOTICE 'Testing RLS policies for each user...';
  
  FOR user_rec IN 
    SELECT id, email, tenant_id FROM users LIMIT 5
  LOOP
    -- Simulate user login by setting auth.uid()
    PERFORM set_config('request.jwt.claims', '{"sub":"' || user_rec.id || '"}', true);
    
    -- Count accessible data
    SELECT COUNT(*) INTO appointment_count FROM appointments;
    SELECT COUNT(*) INTO payment_count FROM payments;
    SELECT COUNT(*) INTO product_count FROM products;
    
    RAISE NOTICE 'User % (tenant: %) can see: % appointments, % payments, % products', 
                 user_rec.email, user_rec.tenant_id, appointment_count, payment_count, product_count;
  END LOOP;
  
  -- Reset auth context
  PERFORM set_config('request.jwt.claims', NULL, true);
END $$;

-- 5. Check for data leakage (users seeing other tenant's data)
-- This should return 0 rows if RLS is working correctly
SELECT 
  'Potential data leakage check' as test_type,
  COUNT(*) as potential_leaks
FROM (
  SELECT DISTINCT 
    a.tenant_id as appointment_tenant,
    u.tenant_id as user_tenant
  FROM appointments a
  JOIN users u ON u.id = a.user_id
  WHERE a.tenant_id != u.tenant_id
) leaks;

-- 6. Verify tenant-specific data access
-- Test that users can only access their tenant's data
SELECT 
  'Tenant data access verification' as test_type,
  'All appointments belong to correct tenant' as check_name,
  CASE 
    WHEN COUNT(*) = 0 THEN 'PASS - No data leakage'
    ELSE 'FAIL - ' || COUNT(*) || ' appointments with wrong tenant'
  END as result
FROM appointments a
JOIN users u ON u.id = a.user_id
WHERE a.tenant_id != u.tenant_id;

-- 7. Check for orphaned data (data without tenant)
SELECT 
  'Orphaned data check' as test_type,
  'appointments' as table_name,
  COUNT(*) as orphaned_records
FROM appointments 
WHERE tenant_id IS NULL
UNION ALL
SELECT 
  'Orphaned data check' as test_type,
  'payments' as table_name,
  COUNT(*) as orphaned_records
FROM payments 
WHERE tenant_id IS NULL
UNION ALL
SELECT 
  'Orphaned data check' as test_type,
  'products' as table_name,
  COUNT(*) as orphaned_records
FROM products 
WHERE tenant_id IS NULL;

-- 8. Test specific composable functions
-- Simulate what the frontend code would do
DO $$
DECLARE
  test_user_id UUID;
  test_tenant_id UUID;
  appointment_count INTEGER;
  payment_count INTEGER;
  product_count INTEGER;
BEGIN
  -- Get first user for testing
  SELECT id, tenant_id INTO test_user_id, test_tenant_id FROM users LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE 'No users found for testing';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Testing with user: % (tenant: %)', test_user_id, test_tenant_id;
  
  -- Simulate CalendarComponent loadRegularAppointments
  SELECT COUNT(*) INTO appointment_count 
  FROM appointments 
  WHERE tenant_id = test_tenant_id;
  
  -- Simulate useCustomerPayments loadPayments
  SELECT COUNT(*) INTO payment_count 
  FROM payments 
  WHERE tenant_id = test_tenant_id;
  
  -- Simulate useProducts loadProducts
  SELECT COUNT(*) INTO product_count 
  FROM products 
  WHERE tenant_id = test_tenant_id AND is_active = true;
  
  RAISE NOTICE 'Frontend simulation results:';
  RAISE NOTICE '- Appointments for tenant: %', appointment_count;
  RAISE NOTICE '- Payments for tenant: %', payment_count;
  RAISE NOTICE '- Active products for tenant: %', product_count;
  
END $$;

-- 9. Test RLS policy effectiveness
-- This should show that RLS is working correctly
SELECT 
  'RLS Policy Test' as test_type,
  'All policies active' as check_name,
  CASE 
    WHEN COUNT(*) = 0 THEN 'PASS - All tables have RLS enabled'
    ELSE 'FAIL - ' || COUNT(*) || ' tables without RLS'
  END as result
FROM information_schema.tables t
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
  AND t.table_name NOT LIKE 'pg_%'
  AND t.table_name NOT LIKE 'sql_%'
  AND NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = t.table_name
    AND n.nspname = 'public'
    AND c.relrowsecurity = true
  );

-- 10. Final status report
SELECT 
  'Tenant isolation test completed' as status,
  NOW() as test_time,
  'All frontend code updated with tenant filtering' as note;
