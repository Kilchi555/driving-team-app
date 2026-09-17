-- UMFASSENDE TENANT_ID MIGRATION
-- Fügt allen relevanten Tabellen tenant_id hinzu
-- ACHTUNG: IMMER BACKUP MACHEN BEVOR DIESE MIGRATION AUSGEFÜHRT WIRD!

-- 1. Zuerst sicherstellen, dass ein Default-Tenant existiert
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = '00000000-0000-0000-0000-000000000001') THEN
        INSERT INTO tenants (id, name, settings, created_at, updated_at) 
        VALUES (
            '00000000-0000-0000-0000-000000000001',
            'Default Tenant',
            '{}',
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Default Tenant erstellt';
    ELSE
        RAISE NOTICE 'Default Tenant bereits vorhanden';
    END IF;
END $$;

-- 2. CANCELLATION TABELLEN
-- cancellation_policies
ALTER TABLE cancellation_policies ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE cancellation_policies SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE cancellation_policies ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE cancellation_policies ADD CONSTRAINT fk_cancellation_policies_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- cancellation_reasons  
ALTER TABLE cancellation_reasons ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE cancellation_reasons SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE cancellation_reasons ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE cancellation_reasons ADD CONSTRAINT fk_cancellation_reasons_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- cancellation_rules
ALTER TABLE cancellation_rules ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE cancellation_rules SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE cancellation_rules ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE cancellation_rules ADD CONSTRAINT fk_cancellation_rules_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- 3. CASH TABELLEN
-- cash_balances
ALTER TABLE cash_balances ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE cash_balances SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE cash_balances ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE cash_balances ADD CONSTRAINT fk_cash_balances_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- cash_confirmations
ALTER TABLE cash_confirmations ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE cash_confirmations SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE cash_confirmations ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE cash_confirmations ADD CONSTRAINT fk_cash_confirmations_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- cash_movements
ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE cash_movements SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE cash_movements ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE cash_movements ADD CONSTRAINT fk_cash_movements_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- cash_transactions
ALTER TABLE cash_transactions ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE cash_transactions SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE cash_transactions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE cash_transactions ADD CONSTRAINT fk_cash_transactions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- 4. GRUNDDATEN TABELLEN
-- categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE categories SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE categories ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE categories ADD CONSTRAINT fk_categories_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- event_types
ALTER TABLE event_types ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE event_types SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE event_types ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE event_types ADD CONSTRAINT fk_event_types_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- locations
ALTER TABLE locations ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE locations SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE locations ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE locations ADD CONSTRAINT fk_locations_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- examiners
ALTER TABLE examiners ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE examiners SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE examiners ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE examiners ADD CONSTRAINT fk_examiners_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- 5. DISCOUNT TABELLEN
-- discount_codes
ALTER TABLE discount_codes ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE discount_codes SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE discount_codes ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE discount_codes ADD CONSTRAINT fk_discount_codes_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- discount_sales
ALTER TABLE discount_sales ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE discount_sales SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE discount_sales ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE discount_sales ADD CONSTRAINT fk_discount_sales_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- 6. VERKAUF TABELLEN
-- product_sales
ALTER TABLE product_sales ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE product_sales SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE product_sales ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE product_sales ADD CONSTRAINT fk_product_sales_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- 7. PRÜFUNG TABELLEN
-- exam_results
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE exam_results SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE exam_results ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE exam_results ADD CONSTRAINT fk_exam_results_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- 8. KUNDEN TABELLEN
-- invited_customers
ALTER TABLE invited_customers ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE invited_customers SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE invited_customers ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE invited_customers ADD CONSTRAINT fk_invited_customers_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- company_billing_addresses
ALTER TABLE company_billing_addresses ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE company_billing_addresses SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE company_billing_addresses ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE company_billing_addresses ADD CONSTRAINT fk_company_billing_addresses_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- 9. RECHNUNG TABELLEN
-- invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE invoices SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE invoices ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE invoices ADD CONSTRAINT fk_invoices_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- invoice_items
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE invoice_items SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE invoice_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE invoice_items ADD CONSTRAINT fk_invoice_items_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- invoice_payments
ALTER TABLE invoice_payments ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE invoice_payments SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE invoice_payments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE invoice_payments ADD CONSTRAINT fk_invoice_payments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- 10. NOTIZEN UND LOGS
-- notes
ALTER TABLE notes ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE notes SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE notes ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE notes ADD CONSTRAINT fk_notes_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- sms_logs
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE sms_logs SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE sms_logs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE sms_logs ADD CONSTRAINT fk_sms_logs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- 11. PAYMENT TABELLEN
-- payment_items
ALTER TABLE payment_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE payment_items SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE payment_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE payment_items ADD CONSTRAINT fk_payment_items_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- payment_logs
ALTER TABLE payment_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE payment_logs SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE payment_logs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE payment_logs ADD CONSTRAINT fk_payment_logs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- 12. PREISE UND KREDITE
-- pricing_rules
ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE pricing_rules SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE pricing_rules ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE pricing_rules ADD CONSTRAINT fk_pricing_rules_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- student_credits
ALTER TABLE student_credits ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE student_credits SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE student_credits ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE student_credits ADD CONSTRAINT fk_student_credits_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- credit_transactions
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE credit_transactions SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE credit_transactions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE credit_transactions ADD CONSTRAINT fk_credit_transactions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- HINWEIS: payment_methods bleibt vorerst ohne tenant_id da diese global sein könnten
-- Falls nötig, kann das später hinzugefügt werden:
-- ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS tenant_id UUID;

RAISE NOTICE 'Migration erfolgreich abgeschlossen! Alle relevanten Tabellen haben jetzt tenant_id Spalten.';