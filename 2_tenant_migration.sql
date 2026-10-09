-- SCHRITT 2: UMFASSENDE TENANT_ID MIGRATION
-- Fügt allen relevanten Tabellen tenant_id hinzu
-- ACHTUNG: BACKUP MACHEN BEVOR DIESE MIGRATION AUSGEFÜHRT WIRD!

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
ALTER TABLE cancellation_policies ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE cancellation_policies SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE cancellation_policies ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE cancellation_reasons ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE cancellation_reasons SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE cancellation_reasons ALTER COLUMN tenant_id SET NOT NULL;

-- 3. GRUNDDATEN TABELLEN
ALTER TABLE categories ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE categories SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE categories ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE event_types ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE event_types SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE event_types ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE locations ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE locations SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE locations ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE examiners ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE examiners SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE examiners ALTER COLUMN tenant_id SET NOT NULL;

-- 4. DISCOUNT TABELLEN
ALTER TABLE discount_codes ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE discount_codes SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE discount_codes ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE discount_sales ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE discount_sales SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE discount_sales ALTER COLUMN tenant_id SET NOT NULL;

-- 5. VERKAUF TABELLEN
ALTER TABLE product_sales ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE product_sales SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE product_sales ALTER COLUMN tenant_id SET NOT NULL;

-- 6. RECHNUNG TABELLEN
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE invoices SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE invoices ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE invoice_items SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE invoice_items ALTER COLUMN tenant_id SET NOT NULL;

-- 7. NOTIZEN UND LOGS
ALTER TABLE notes ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE notes SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE notes ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE sms_logs SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE sms_logs ALTER COLUMN tenant_id SET NOT NULL;

-- 8. KREDITE
ALTER TABLE student_credits ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE student_credits SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE student_credits ALTER COLUMN tenant_id SET NOT NULL;

RAISE NOTICE 'Migration erfolgreich abgeschlossen! Alle Tabellen haben jetzt tenant_id.';