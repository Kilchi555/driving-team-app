-- Einfacher Tenant-Isolation Test
-- Führen Sie diesen Test in der Supabase SQL-Konsole aus

-- 1. Aktuelle Tenant-Setup prüfen
SELECT 
  'Tenant Setup' as test,
  COUNT(*) as total_tenants,
  array_agg(name) as tenant_names
FROM tenants;

-- 2. User-Tenant Mapping prüfen
SELECT 
  'User-Tenant Mapping' as test,
  u.email,
  u.tenant_id,
  t.name as tenant_name
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
ORDER BY u.email
LIMIT 10;

-- 3. Datenverteilung pro Tenant
SELECT 
  'Data Distribution' as test,
  t.name as tenant_name,
  COUNT(DISTINCT u.id) as users,
  COUNT(DISTINCT a.id) as appointments,
  COUNT(DISTINCT p.id) as payments,
  COUNT(DISTINCT pr.id) as products
FROM tenants t
LEFT JOIN users u ON u.tenant_id = t.id
LEFT JOIN appointments a ON a.tenant_id = t.id
LEFT JOIN payments p ON p.tenant_id = t.id
LEFT JOIN products pr ON pr.tenant_id = t.id
GROUP BY t.id, t.name
ORDER BY t.name;

-- 4. RLS Policies Status prüfen
SELECT 
  'RLS Status' as test,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('appointments', 'payments', 'products', 'users')
ORDER BY tablename;

-- 5. Test: Alle Daten haben tenant_id
SELECT 
  'Missing tenant_id' as test,
  'appointments' as table_name,
  COUNT(*) as missing_count
FROM appointments 
WHERE tenant_id IS NULL
UNION ALL
SELECT 
  'Missing tenant_id' as test,
  'payments' as table_name,
  COUNT(*) as missing_count
FROM payments 
WHERE tenant_id IS NULL
UNION ALL
SELECT 
  'Missing tenant_id' as test,
  'products' as table_name,
  COUNT(*) as missing_count
FROM products 
WHERE tenant_id IS NULL;

-- 6. Test: Datenlecks prüfen
SELECT 
  'Data Leak Check' as test,
  CASE 
    WHEN COUNT(*) = 0 THEN 'PASS - No data leaks'
    ELSE 'FAIL - ' || COUNT(*) || ' appointments with wrong tenant'
  END as result
FROM appointments a
JOIN users u ON u.id = a.user_id
WHERE a.tenant_id != u.tenant_id;

-- 7. Frontend Simulation Test
-- Simuliert was die Composables laden würden
DO $$
DECLARE
  test_user_id UUID;
  test_tenant_id UUID;
  appointment_count INTEGER;
  payment_count INTEGER;
  product_count INTEGER;
BEGIN
  -- Ersten User für Test nehmen
  SELECT id, tenant_id INTO test_user_id, test_tenant_id FROM users LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE 'Keine Benutzer gefunden';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Test mit User: % (Tenant: %)', test_user_id, test_tenant_id;
  
  -- Simuliere CalendarComponent
  SELECT COUNT(*) INTO appointment_count 
  FROM appointments 
  WHERE tenant_id = test_tenant_id;
  
  -- Simuliere useCustomerPayments
  SELECT COUNT(*) INTO payment_count 
  FROM payments 
  WHERE tenant_id = test_tenant_id;
  
  -- Simuliere useProducts
  SELECT COUNT(*) INTO product_count 
  FROM products 
  WHERE tenant_id = test_tenant_id AND is_active = true;
  
  RAISE NOTICE 'Frontend Simulation Ergebnisse:';
  RAISE NOTICE '- Termine für Tenant: %', appointment_count;
  RAISE NOTICE '- Zahlungen für Tenant: %', payment_count;
  RAISE NOTICE '- Aktive Produkte für Tenant: %', product_count;
  
END $$;

-- 8. Abschluss-Status
SELECT 
  'Test abgeschlossen' as status,
  NOW() as test_time;
