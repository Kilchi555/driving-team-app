-- Erweitere payments Tabelle um Guthaben-Integration
-- Führe diesen Code in Supabase aus

-- Neue Spalten für Guthaben-Integration
ALTER TABLE payments ADD COLUMN IF NOT EXISTS credit_used_rappen INTEGER DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS credit_transaction_id UUID REFERENCES credit_transactions(id);

-- Kommentare für bessere Dokumentation
COMMENT ON COLUMN payments.credit_used_rappen IS 'Wie viel Guthaben wurde für diese Zahlung verwendet (in Rappen)';
COMMENT ON COLUMN payments.credit_transaction_id IS 'Verknüpfung zur Guthaben-Transaktion in credit_transactions';

-- Index für bessere Performance bei Abfragen
CREATE INDEX IF NOT EXISTS idx_payments_credit_transaction_id ON payments(credit_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_credit_used ON payments(credit_used_rappen);

-- Überprüfung
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND column_name IN ('credit_used_rappen', 'credit_transaction_id')
ORDER BY column_name;
