-- Couvert-Fensterposition für Rechnungs-/Mahnung-PDFs (links = DIN/CH-Standard, rechts optional)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS invoice_window_side text NOT NULL DEFAULT 'left'
  CHECK (invoice_window_side IN ('left', 'right'));

COMMENT ON COLUMN tenants.invoice_window_side IS
  'Couvert-Fensterposition auf Rechnungs-/Mahnung-PDFs: left (DIN/CH Standard) oder right';
