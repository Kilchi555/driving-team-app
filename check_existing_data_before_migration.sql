-- Überprüfung der bestehenden Daten vor der tenant_id Migration

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
SELECT 'cancellation_rules', COUNT(*) FROM cancellation_rules
UNION ALL
SELECT 'cash_balances', COUNT(*) FROM cash_balances
UNION ALL
SELECT 'cash_confirmations', COUNT(*) FROM cash_confirmations
UNION ALL
SELECT 'cash_movements', COUNT(*) FROM cash_movements
UNION ALL
SELECT 'cash_transactions', COUNT(*) FROM cash_transactions
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'company_billing_addresses', COUNT(*) FROM company_billing_addresses
UNION ALL
SELECT 'credit_transactions', COUNT(*) FROM credit_transactions
UNION ALL
SELECT 'discount_codes', COUNT(*) FROM discount_codes
UNION ALL
SELECT 'discount_sales', COUNT(*) FROM discount_sales
UNION ALL
SELECT 'event_types', COUNT(*) FROM event_types
UNION ALL
SELECT 'exam_results', COUNT(*) FROM exam_results
UNION ALL
SELECT 'examiners', COUNT(*) FROM examiners
UNION ALL
SELECT 'invited_customers', COUNT(*) FROM invited_customers
UNION ALL
SELECT 'invoice_items', COUNT(*) FROM invoice_items
UNION ALL
SELECT 'invoice_payments', COUNT(*) FROM invoice_payments
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'locations', COUNT(*) FROM locations
UNION ALL
SELECT 'notes', COUNT(*) FROM notes
UNION ALL
SELECT 'payment_items', COUNT(*) FROM payment_items
UNION ALL
SELECT 'payment_logs', COUNT(*) FROM payment_logs
UNION ALL
SELECT 'payment_methods', COUNT(*) FROM payment_methods
UNION ALL
SELECT 'pricing_rules', COUNT(*) FROM pricing_rules
UNION ALL
SELECT 'product_sales', COUNT(*) FROM product_sales
UNION ALL
SELECT 'sms_logs', COUNT(*) FROM sms_logs
UNION ALL
SELECT 'student_credits', COUNT(*) FROM student_credits
ORDER BY record_count DESC, table_name;

-- 3. Check ob default tenant existiert
SELECT 
    id, 
    name, 
    created_at 
FROM tenants 
WHERE name = 'Default Tenant' OR id = '00000000-0000-0000-0000-000000000001';