-- Test tenant data isolation and data loading
-- Verify that users only see data from their own tenant

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
  COUNT(DISTINCT p.id) as payment_count
FROM tenants t
LEFT JOIN users u ON u.tenant_id = t.id
LEFT JOIN appointments a ON a.tenant_id = t.id
LEFT JOIN payments p ON p.tenant_id = t.id
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

-- 8. Test tenant switching functionality
-- Create a test function to simulate tenant switching
CREATE OR REPLACE FUNCTION test_tenant_switch(target_tenant_id UUID)
RETURNS TABLE (
  tenant_name TEXT,
  appointment_count BIGINT,
  payment_count BIGINT,
  product_count BIGINT
) AS $$
BEGIN
  -- Switch to target tenant
  UPDATE users 
  SET tenant_id = target_tenant_id 
  WHERE id = auth.uid();
  
  -- Return data counts for this tenant
  RETURN QUERY
  SELECT 
    t.name as tenant_name,
    COUNT(a.id) as appointment_count,
    COUNT(p.id) as payment_count,
    COUNT(pr.id) as product_count
  FROM tenants t
  LEFT JOIN appointments a ON a.tenant_id = t.id
  LEFT JOIN payments p ON p.tenant_id = t.id
  LEFT JOIN products pr ON pr.tenant_id = t.id
  WHERE t.id = target_tenant_id
  GROUP BY t.id, t.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Final status report
SELECT 
  'Tenant isolation test completed' as status,
  NOW() as test_time;
