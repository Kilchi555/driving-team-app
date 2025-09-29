-- Create comprehensive RLS policies for all tables with tenant_id
-- This ensures proper tenant isolation and data security

-- 1. Drop existing policies to avoid conflicts
DO $$ 
DECLARE
  table_name TEXT;
  policy_rec RECORD;
  tables_with_tenant_id TEXT[] := ARRAY[
    'cancellation_policies', 'cancellation_reasons', 'cancellation_rules',
    'cash_balances', 'cash_confirmations', 'cash_movements', 'cash_transactions',
    'categories', 'company_billing_addresses', 'credit_transactions',
    'discount_codes', 'discount_sales', 'event_types', 'exam_results',
    'examiners', 'invited_customers', 'invoice_items', 'invoice_payments',
    'invoices', 'locations', 'notes', 'payment_items', 'payment_logs',
    'payment_methods', 'pricing_rules', 'product_sales', 'sms_logs', 'student_credits',
    'analytics_events', 'appointments', 'discounts', 'evaluation_categories',
    'evaluation_criteria', 'evaluation_scale', 'payments', 'products',
    'reminder_providers', 'reminder_settings', 'reminder_templates',
    'system_metrics', 'tenant_analytics_summary', 'tenant_settings', 'users'
  ];
BEGIN
  -- Drop existing policies for all tables
  FOREACH table_name IN ARRAY tables_with_tenant_id
  LOOP
    -- Drop all existing policies for this table
    FOR policy_rec IN 
      SELECT policyname FROM pg_policies WHERE tablename = table_name
    LOOP
      EXECUTE 'DROP POLICY IF EXISTS "' || policy_rec.policyname || '" ON ' || table_name;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Dropped existing policies for all tables';
END $$;

-- 2. Enable RLS on all tables
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
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_credits ENABLE ROW LEVEL SECURITY;

-- 3. Create tenant-aware policies for each table
-- Cancellation policies
CREATE POLICY cancellation_policies_tenant_access ON cancellation_policies
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY cancellation_reasons_tenant_access ON cancellation_reasons
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY cancellation_rules_tenant_access ON cancellation_rules
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Cash management policies
CREATE POLICY cash_balances_tenant_access ON cash_balances
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY cash_confirmations_tenant_access ON cash_confirmations
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY cash_movements_tenant_access ON cash_movements
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY cash_transactions_tenant_access ON cash_transactions
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Core business policies
CREATE POLICY categories_tenant_access ON categories
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY company_billing_addresses_tenant_access ON company_billing_addresses
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY credit_transactions_tenant_access ON credit_transactions
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Discount policies
CREATE POLICY discount_codes_tenant_access ON discount_codes
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY discount_sales_tenant_access ON discount_sales
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Event and exam policies
CREATE POLICY event_types_tenant_access ON event_types
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY exam_results_tenant_access ON exam_results
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY examiners_tenant_access ON examiners
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Customer policies
CREATE POLICY invited_customers_tenant_access ON invited_customers
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Invoice policies
CREATE POLICY invoice_items_tenant_access ON invoice_items
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY invoice_payments_tenant_access ON invoice_payments
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY invoices_tenant_access ON invoices
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Location and notes policies
CREATE POLICY locations_tenant_access ON locations
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY notes_tenant_access ON notes
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Payment policies
CREATE POLICY payment_items_tenant_access ON payment_items
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY payment_logs_tenant_access ON payment_logs
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY payment_methods_tenant_access ON payment_methods
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Pricing and product policies
CREATE POLICY pricing_rules_tenant_access ON pricing_rules
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY product_sales_tenant_access ON product_sales
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- SMS and student policies
CREATE POLICY sms_logs_tenant_access ON sms_logs
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY student_credits_tenant_access ON student_credits
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- 4. Update existing policies for tables that already had RLS
-- Appointments (update existing policy)
DROP POLICY IF EXISTS "Appointments are viewable by users" ON appointments;
DROP POLICY IF EXISTS "Users can view their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can insert their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can delete their own appointments" ON appointments;

CREATE POLICY appointments_tenant_access ON appointments
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Payments (update existing policy)
DROP POLICY IF EXISTS "Payments are viewable by users" ON payments;
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
DROP POLICY IF EXISTS "Users can insert their own payments" ON payments;
DROP POLICY IF EXISTS "Users can update their own payments" ON payments;
DROP POLICY IF EXISTS "Users can delete their own payments" ON payments;

CREATE POLICY payments_tenant_access ON payments
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Products (update existing policy)
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
DROP POLICY IF EXISTS "Products are manageable by admins" ON products;

CREATE POLICY products_tenant_access ON products
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Discounts (update existing policy)
DROP POLICY IF EXISTS "Discounts are viewable by everyone" ON discounts;
DROP POLICY IF EXISTS "Discounts are manageable by admins" ON discounts;

CREATE POLICY discounts_tenant_access ON discounts
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Users (update existing policy)
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

CREATE POLICY users_tenant_access ON users
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- 5. Special policies for system tables (admin only)
CREATE POLICY tenant_analytics_summary_admin_access ON tenant_analytics_summary
  FOR ALL TO authenticated
  USING (
    auth.role() = 'admin' OR
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY tenant_settings_admin_access ON tenant_settings
  FOR ALL TO authenticated
  USING (
    auth.role() = 'admin' OR
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- 6. Status report
SELECT 
  'RLS Policies created successfully' as status,
  COUNT(*) as tables_with_rls
FROM information_schema.tables t
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
  AND EXISTS (
    SELECT 1 FROM pg_policies p 
    WHERE p.tablename = t.table_name
  );
