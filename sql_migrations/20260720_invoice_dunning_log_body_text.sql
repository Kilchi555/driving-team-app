-- Klartext des Mahnschreibens für PDF-Regenerierung / Audit
ALTER TABLE invoice_dunning_log
  ADD COLUMN IF NOT EXISTS body_text TEXT;

COMMENT ON COLUMN invoice_dunning_log.body_text IS
  'Klartext des Mahnschreibens (für PDF-Regenerierung / Audit), parallel zu body_html';
