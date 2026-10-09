-- SCHRITT 3: RLS POLICIES FÜR TENANT ISOLATION
-- Diese Policies stellen sicher, dass Benutzer nur ihre eigenen Tenant-Daten sehen

-- RLS aktivieren für alle Tabellen
ALTER TABLE cancellation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE examiners ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_credits ENABLE ROW LEVEL SECURITY;

-- Alte Policies löschen falls vorhanden
DROP POLICY IF EXISTS tenant_isolation_policy ON cancellation_policies;
DROP POLICY IF EXISTS tenant_isolation_policy ON cancellation_reasons;
DROP POLICY IF EXISTS tenant_isolation_policy ON categories;
DROP POLICY IF EXISTS tenant_isolation_policy ON event_types;
DROP POLICY IF EXISTS tenant_isolation_policy ON locations;
DROP POLICY IF EXISTS tenant_isolation_policy ON examiners;
DROP POLICY IF EXISTS tenant_isolation_policy ON discount_codes;
DROP POLICY IF EXISTS tenant_isolation_policy ON discount_sales;
DROP POLICY IF EXISTS tenant_isolation_policy ON product_sales;
DROP POLICY IF EXISTS tenant_isolation_policy ON invoices;
DROP POLICY IF EXISTS tenant_isolation_policy ON invoice_items;
DROP POLICY IF EXISTS tenant_isolation_policy ON notes;
DROP POLICY IF EXISTS tenant_isolation_policy ON sms_logs;
DROP POLICY IF EXISTS tenant_isolation_policy ON student_credits;

-- NEUE TENANT ISOLATION POLICIES ERSTELLEN
CREATE POLICY tenant_isolation_policy ON cancellation_policies
FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY tenant_isolation_policy ON cancellation_reasons
FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY tenant_isolation_policy ON categories
FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY tenant_isolation_policy ON event_types
FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY tenant_isolation_policy ON locations
FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY tenant_isolation_policy ON examiners
FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY tenant_isolation_policy ON discount_codes
FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY tenant_isolation_policy ON discount_sales
FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY tenant_isolation_policy ON product_sales
FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY tenant_isolation_policy ON invoices
FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY tenant_isolation_policy ON invoice_items
FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY tenant_isolation_policy ON notes
FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY tenant_isolation_policy ON sms_logs
FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY tenant_isolation_policy ON student_credits
FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()));

RAISE NOTICE 'Alle RLS Policies für tenant_id Isolation wurden erstellt!';