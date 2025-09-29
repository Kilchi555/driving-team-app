-- Add tenant_id to remaining tables that are missing it
-- Based on the analysis of missing tenant_id columns

-- 1. Cancellation related tables
ALTER TABLE cancellation_policies 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE cancellation_reasons 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE cancellation_rules 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- 2. Cash management tables
ALTER TABLE cash_balances 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE cash_confirmations 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE cash_movements 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE cash_transactions 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- 3. Core business tables
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE company_billing_addresses 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE credit_transactions 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- 4. Discount related tables
ALTER TABLE discount_codes 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE discount_sales 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- 5. Event and exam tables
ALTER TABLE event_types 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE exam_results 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE examiners 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- 6. Customer related tables
ALTER TABLE invited_customers 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- 7. Invoice related tables
ALTER TABLE invoice_items 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE invoice_payments 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- 8. Location and notes
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE notes 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- 9. Payment related tables
ALTER TABLE payment_items 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE payment_logs 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE payment_methods 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- 10. Pricing and product tables
ALTER TABLE pricing_rules 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE product_sales 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- 11. SMS and student related tables
ALTER TABLE sms_logs 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE student_credits 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- 12. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cancellation_policies_tenant_id ON cancellation_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_reasons_tenant_id ON cancellation_reasons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_rules_tenant_id ON cancellation_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_balances_tenant_id ON cash_balances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_confirmations_tenant_id ON cash_confirmations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_tenant_id ON cash_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_tenant_id ON cash_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_categories_tenant_id ON categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_company_billing_addresses_tenant_id ON company_billing_addresses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_tenant_id ON credit_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_discount_codes_tenant_id ON discount_codes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_discount_sales_tenant_id ON discount_sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_event_types_tenant_id ON event_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_tenant_id ON exam_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_examiners_tenant_id ON examiners(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invited_customers_tenant_id ON invited_customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_tenant_id ON invoice_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_tenant_id ON invoice_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_locations_tenant_id ON locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notes_tenant_id ON notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_items_tenant_id ON payment_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_tenant_id ON payment_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_tenant_id ON payment_methods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_tenant_id ON pricing_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_tenant_id ON product_sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_tenant_id ON sms_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_student_credits_tenant_id ON student_credits(tenant_id);

-- 13. Update existing data to belong to default tenant
DO $$ 
DECLARE
  default_tenant_id UUID;
  table_name TEXT;
  tables_to_update TEXT[] := ARRAY[
    'cancellation_policies', 'cancellation_reasons', 'cancellation_rules',
    'cash_balances', 'cash_confirmations', 'cash_movements', 'cash_transactions',
    'categories', 'company_billing_addresses', 'credit_transactions',
    'discount_codes', 'discount_sales', 'event_types', 'exam_results',
    'examiners', 'invited_customers', 'invoice_items', 'invoice_payments',
    'invoices', 'locations', 'notes', 'payment_items', 'payment_logs',
    'payment_methods', 'pricing_rules', 'product_sales', 'sms_logs', 'student_credits'
  ];
BEGIN
  -- Get the first tenant (or create one if none exists)
  SELECT id INTO default_tenant_id FROM tenants LIMIT 1;
  
  IF default_tenant_id IS NULL THEN
    -- Create a default tenant if none exists
    INSERT INTO tenants (name, slug, subscription_status, subscription_plan, is_active)
    VALUES ('Standard Fahrschule', 'default', 'active', 'basic', true)
    RETURNING id INTO default_tenant_id;
  END IF;
  
  -- Update each table
  FOREACH table_name IN ARRAY tables_to_update
  LOOP
    EXECUTE format('UPDATE %I SET tenant_id = %L WHERE tenant_id IS NULL', 
                   table_name, default_tenant_id);
    RAISE NOTICE 'Updated table: %', table_name;
  END LOOP;
  
  RAISE NOTICE 'Updated existing data to belong to tenant: %', default_tenant_id;
END $$;

-- 14. Status report
SELECT 
  'Migration completed successfully' as status,
  COUNT(*) as tables_updated
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'cancellation_policies', 'cancellation_reasons', 'cancellation_rules',
    'cash_balances', 'cash_confirmations', 'cash_movements', 'cash_transactions',
    'categories', 'company_billing_addresses', 'credit_transactions',
    'discount_codes', 'discount_sales', 'event_types', 'exam_results',
    'examiners', 'invited_customers', 'invoice_items', 'invoice_payments',
    'invoices', 'locations', 'notes', 'payment_items', 'payment_logs',
    'payment_methods', 'pricing_rules', 'product_sales', 'sms_logs', 'student_credits'
  );
