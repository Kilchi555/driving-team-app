-- Add QR-invoice and invoice numbering fields to tenants
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS qr_iban TEXT,
  ADD COLUMN IF NOT EXISTS invoice_number_prefix TEXT DEFAULT 'RE',
  ADD COLUMN IF NOT EXISTS next_invoice_number INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS invoice_street TEXT,
  ADD COLUMN IF NOT EXISTS invoice_street_nr TEXT,
  ADD COLUMN IF NOT EXISTS invoice_zip TEXT,
  ADD COLUMN IF NOT EXISTS invoice_city TEXT;
