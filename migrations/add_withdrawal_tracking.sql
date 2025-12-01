-- Migration: Add withdrawal/payout tracking to student_credits
-- Ermöglicht das Tracking von Guthaben-Auszahlungen über Wallee

-- 1. Füge neue Spalten zur student_credits Tabelle hinzu
ALTER TABLE IF EXISTS student_credits
ADD COLUMN IF NOT EXISTS pending_withdrawal_rappen INTEGER DEFAULT 0, -- Ausstehende Auszahlung
ADD COLUMN IF NOT EXISTS completed_withdrawal_rappen INTEGER DEFAULT 0, -- Verarbeitete Auszahlung (kumulativ)
ADD COLUMN IF NOT EXISTS last_withdrawal_at TIMESTAMP WITH TIME ZONE, -- Zeitstempel der letzten Auszahlung
ADD COLUMN IF NOT EXISTS last_withdrawal_amount_rappen INTEGER, -- Betrag der letzten Auszahlung
ADD COLUMN IF NOT EXISTS last_withdrawal_status VARCHAR(50), -- Status der letzten Auszahlung (pending, completed, failed)
ADD COLUMN IF NOT EXISTS last_wallee_refund_id VARCHAR(255); -- Wallee Refund Transaction ID

-- 2. Erweitere credit_transactions um Wallee-spezifische Felder
ALTER TABLE IF EXISTS credit_transactions
ADD COLUMN IF NOT EXISTS wallee_refund_id VARCHAR(255), -- Wallee Transaction/Refund ID
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed'; -- Status: pending, completed, failed, cancelled

-- 3. Füge neue transaction_type Options hinzu durch ein Comment (für Dokumentation)
-- Neue Typen: 'withdrawal' (Auszahlung angefordert), 'withdrawal_completed' (Auszahlung verarbeitet), 'withdrawal_failed'

-- 4. Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_student_credits_pending_withdrawal ON student_credits(pending_withdrawal_rappen);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_wallee_refund_id ON credit_transactions(wallee_refund_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_status ON credit_transactions(status);

-- 5. Comments für Dokumentation
COMMENT ON COLUMN student_credits.pending_withdrawal_rappen IS 'Guthaben das zur Auszahlung angefordert wurde (ausstehend)';
COMMENT ON COLUMN student_credits.completed_withdrawal_rappen IS 'Gesamtbetrag aller verarbeiteten Auszahlungen (kumulativ)';
COMMENT ON COLUMN student_credits.last_withdrawal_at IS 'Zeitstempel der letzten Auszahlungsanforderung';
COMMENT ON COLUMN student_credits.last_withdrawal_amount_rappen IS 'Betrag der letzten Auszahlungsanforderung';
COMMENT ON COLUMN student_credits.last_withdrawal_status IS 'Status der letzten Auszahlung (pending, completed, failed)';
COMMENT ON COLUMN student_credits.last_wallee_refund_id IS 'Wallee Transaction ID der letzten Auszahlung für Tracking';
COMMENT ON COLUMN credit_transactions.wallee_refund_id IS 'Wallee Refund/Payout Transaction ID für externe Tracking';
COMMENT ON COLUMN credit_transactions.status IS 'Status der Transaktion: pending (in progress), completed (finished), failed (error), cancelled (abgebrochen)';

