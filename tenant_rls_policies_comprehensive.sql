-- UMFASSENDE RLS POLICIES FÜR ALLE TABELLEN MIT TENANT_ID
-- Diese Policies stellen sicher, dass Benutzer nur ihre eigenen Tenant-Daten sehen können

-- RLS aktivieren für alle relevanten Tabellen
ALTER TABLE cancellation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_billing_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE examiners ENABLE ROW LEVEL SECURITY;
ALTER TABLE invited_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_credits ENABLE ROW LEVEL SECURITY;

-- Alte Policies löschen falls vorhanden (um Konflikte zu vermeiden)
DROP POLICY IF EXISTS tenant_isolation_policy ON cancellation_policies;
DROP POLICY IF EXISTS tenant_isolation_policy ON cancellation_reasons;
DROP POLICY IF EXISTS tenant_isolation_policy ON cancellation_rules;
DROP POLICY IF EXISTS tenant_isolation_policy ON cash_balances;
DROP POLICY IF EXISTS tenant_isolation_policy ON cash_confirmations;
DROP POLICY IF EXISTS tenant_isolation_policy ON cash_movements;
DROP POLICY IF EXISTS tenant_isolation_policy ON cash_transactions;
DROP POLICY IF EXISTS tenant_isolation_policy ON categories;
DROP POLICY IF EXISTS tenant_isolation_policy ON company_billing_addresses;
DROP POLICY IF EXISTS tenant_isolation_policy ON credit_transactions;
DROP POLICY IF EXISTS tenant_isolation_policy ON discount_codes;
DROP POLICY IF EXISTS tenant_isolation_policy ON discount_sales;
DROP POLICY IF EXISTS tenant_isolation_policy ON event_types;
DROP POLICY IF EXISTS tenant_isolation_policy ON exam_results;
DROP POLICY IF EXISTS tenant_isolation_policy ON examiners;
DROP POLICY IF EXISTS tenant_isolation_policy ON invited_customers;
DROP POLICY IF EXISTS tenant_isolation_policy ON invoice_items;
DROP POLICY IF EXISTS tenant_isolation_policy ON invoice_payments;
DROP POLICY IF EXISTS tenant_isolation_policy ON invoices;
DROP POLICY IF EXISTS tenant_isolation_policy ON locations;
DROP POLICY IF EXISTS tenant_isolation_policy ON notes;
DROP POLICY IF EXISTS tenant_isolation_policy ON payment_items;
DROP POLICY IF EXISTS tenant_isolation_policy ON payment_logs;
DROP POLICY IF EXISTS tenant_isolation_policy ON pricing_rules;
DROP POLICY IF EXISTS tenant_isolation_policy ON product_sales;
DROP POLICY IF EXISTS tenant_isolation_policy ON sms_logs;
DROP POLICY IF EXISTS tenant_isolation_policy ON student_credits;

-- NEUE TENANT ISOLATION POLICIES ERSTELLEN
-- 1. CANCELLATION POLICIES
CREATE POLICY tenant_isolation_policy ON cancellation_policies
FOR ALL TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
    )
);

-- 2. CANCELLATION REASONS
CREATE POLICY tenant_isolation_policy ON cancellation_reasons
FOR ALL TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
    )
);

-- 3. CANCELLATION RULES
CREATE POLICY tenant_isolation_policy ON cancellation_rules
FOR ALL TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
    )
);

-- 4. CASH BALANCES
CREATE POLICY tenant_isolation_policy ON cash_balances
FOR ALL TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
    )
);

-- 5. CASH CONFIRMATIONS
CREATE POLICY tenant_isolation_policy ON cash_confirmations
FOR ALL TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
    )
);

-- 6. CASH MOVEMENTS
CREATE POLICY tenant_isolation_policy ON cash_movements
FOR ALL TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
    )
);

-- 7. CASH TRANSACTIONS
CREATE POLICY tenant_isolation_policy ON cash_transactions
FOR ALL TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
    )
);

-- 8. CATEGORIES
CREATE POLICY tenant_isolation_policy ON categories
FOR ALL TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
    )
);

-- 9. COMPANY BILLING ADDRESSES
CREATE POLICY tenant_isolation_policy ON company_billing_addresses
FOR ALL TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
    )
);

-- 10. CREDIT TRANSACTIONS
CREATE POLICY tenant_isolation_policy ON credit_transactions
FOR ALL TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
    )
);

-- 11. DISCOUNT CODES
CREATE POLICY tenant_isolation_policy ON discount_codes
FOR ALL TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
    )
);

-- 12. DISCOUNT SALES
CREATE POLICY tenant_isolation_policy ON discount_sales
FOR ALL TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
    )
);

-- 13. EVENT TYPES
CREATE POLICY tenant_isolation_policy ON event_types
FOR ALL TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
    )
);

-- 14. EXAM RESULTS
CREATE POLICY tenant_isolation_policy ON exam_results
FOR ALL TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
    )
);

-- 15. EXAMINERS
CREATE POLICY tenant_isolation_policy ON examiners
FOR ALL TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
    )
);

-- 16. INVITED CUSTOMERS
CREATE POLICY tenant_isolation_policy ON invited_customers
FOR ALL TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
    )
);

-- 17. INVOICE ITEMS
CREATE POLICY tenant_isolation_policy ON invoice_items
FOR ALL TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
    )
);

-- 18. INVOICE PAYMENTS
CREATE POLICY tenant_isolation_policy ON invoice_payments
FOR ALL TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
    )
);

-- 19. INVOICES
CREATE POLICY tenant_isolation_policy ON invoices
FOR ALL TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
    )
);

-- 20. LOCATIONS
CREATE POLICY tenant_isolation_policy ON locations
FOR ALL TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
    )
);

-- 21. NOTES
CREATE POLICY tenant_isolation_policy ON notes
FOR ALL TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
    )
);

-- 22. PAYMENT ITEMS
CREATE POLICY tenant_isolation_policy ON payment_items
FOR ALL TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
    )
);

-- 23. PAYMENT LOGS
CREATE POLICY tenant_isolation_policy ON payment_logs
FOR ALL TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
    )
);

-- 24. PRICING RULES
CREATE POLICY tenant_isolation_policy ON pricing_rules
FOR ALL TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
    )
);

-- 25. PRODUCT SALES
CREATE POLICY tenant_isolation_policy ON product_sales
FOR ALL TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
    )
);

-- 26. SMS LOGS
CREATE POLICY tenant_isolation_policy ON sms_logs
FOR ALL TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
    )
);

-- 27. STUDENT CREDITS
CREATE POLICY tenant_isolation_policy ON student_credits
FOR ALL TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
    )
);

RAISE NOTICE 'Alle RLS Policies für tenant_id Isolation wurden erfolgreich erstellt!';