-- Add missing columns to payments table
-- Erstellt: 2025-08-14
-- Zweck: Alle fehlenden Spalten hinzufügen, die der Code erwartet

-- 1. Fehlende Spalten hinzufügen
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS invoice_address JSONB,
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS company_billing_address_id UUID REFERENCES company_billing_addresses(id);

-- 2. Erfolgsmeldung
SELECT '✅ All missing columns added to payments table!' as status;
