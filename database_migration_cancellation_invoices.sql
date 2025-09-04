-- Migration: Add cancellation invoice support
-- Date: 2025-01-22
-- Description: Erweitert die invoices Tabelle um Stornierungs-Rechnungen

-- Füge invoice_type Spalte hinzu (falls nicht vorhanden)
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'regular';

-- Füge appointment_id Spalte hinzu (falls nicht vorhanden)
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id);

-- Erstelle Index für invoice_type
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(invoice_type);

-- Erstelle Index für appointment_id
CREATE INDEX IF NOT EXISTS idx_invoices_appointment_id ON invoices(appointment_id);

-- Kommentare hinzufügen
COMMENT ON COLUMN invoices.invoice_type IS 'Art der Rechnung: regular, cancellation_fee, product_sale, etc.';
COMMENT ON COLUMN invoices.appointment_id IS 'Referenz auf den zugehörigen Termin (für Stornierungs-Rechnungen)';

-- Aktualisiere bestehende Rechnungen
UPDATE invoices 
SET invoice_type = 'regular' 
WHERE invoice_type IS NULL;

-- Beispiel-Stornierungs-Rechnung (optional)
-- INSERT INTO invoices (user_id, staff_id, amount_rappen, description, status, invoice_type, created_at)
-- VALUES (
--   '00000000-0000-0000-0000-000000000000', -- Beispiel user_id
--   '00000000-0000-0000-0000-000000000000', -- Beispiel staff_id
--   5000, -- 50.00 CHF in Rappen
--   'Beispiel Stornogebühr',
--   'pending',
--   'cancellation_fee',
--   NOW()
-- );
