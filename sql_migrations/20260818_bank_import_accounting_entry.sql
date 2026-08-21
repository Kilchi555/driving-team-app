-- CAMT-Ausgabenabgleich: Bankzeile an Buchung hängen
ALTER TABLE bank_import_records
  ADD COLUMN IF NOT EXISTS accounting_entry_id UUID REFERENCES accounting_entries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bank_import_records_accounting_entry
  ON bank_import_records(accounting_entry_id);
