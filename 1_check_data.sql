-- SCHRITT 1: Überprüfung der bestehenden Daten vor der tenant_id Migration

-- 1. Schauen ob es bereits Tenants gibt
SELECT 'tenants' as table_name, COUNT(*) as record_count FROM tenants;

-- 2. Alle Tabellen ohne tenant_id die Daten haben
SELECT 
    'cancellation_policies' as table_name, 
    COUNT(*) as record_count 
FROM cancellation_policies
UNION ALL
SELECT 'cancellation_reasons', COUNT(*) FROM cancellation_reasons
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'discount_codes', COUNT(*) FROM discount_codes
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'locations', COUNT(*) FROM locations
UNION ALL
SELECT 'notes', COUNT(*) FROM notes
UNION ALL
SELECT 'product_sales', COUNT(*) FROM product_sales
UNION ALL
SELECT 'student_credits', COUNT(*) FROM student_credits
ORDER BY record_count DESC, table_name;