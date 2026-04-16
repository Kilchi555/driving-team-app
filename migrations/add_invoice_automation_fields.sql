-- Migration: add_invoice_automation_fields.sql
-- Fügt Felder hinzu, die für die automatische Rechnungserstellung benötigt werden.

-- 1. payments.invoice_id: Verknüpfung zur zugehörigen Rechnung
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- Index für schnelle Abfragen "Zahlungen ohne Rechnung"
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id)
  WHERE invoice_id IS NOT NULL;

-- 2. invoice_items.payment_id: Rückverweis von Invoice-Item zur Ursprungs-Zahlung
ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id) ON DELETE SET NULL;

-- 3. tenants: Rechnungsnummer-Autoincrement und Prefix
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS invoice_number_prefix    TEXT    DEFAULT 'RE',
  ADD COLUMN IF NOT EXISTS next_invoice_number      INTEGER DEFAULT 1;

-- 4. invoice_items.tenant_id (für RLS)
ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Vorhandene Zeilen mit tenant_id befüllen (über invoice)
UPDATE invoice_items ii
SET    tenant_id = i.tenant_id
FROM   invoices i
WHERE  ii.invoice_id = i.id
  AND  ii.tenant_id IS NULL;
