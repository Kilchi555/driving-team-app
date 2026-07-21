-- 20260721_bank_import_records_rename.sql
-- Verallgemeinert die zuvor CAMT-spezifische Dedupe-Tabelle für Bank-Zahlungsimporte,
-- damit sie auch vom neuen CSV-Import genutzt werden kann.

ALTER TABLE camt_import_records RENAME TO bank_import_records;
ALTER TABLE bank_import_records ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'camt';

ALTER TABLE bank_import_records
  RENAME CONSTRAINT camt_import_records_tenant_id_dedupe_key_key TO bank_import_records_tenant_id_dedupe_key_key;

ALTER INDEX IF EXISTS idx_camt_import_records_tenant RENAME TO idx_bank_import_records_tenant;
ALTER INDEX IF EXISTS idx_camt_import_records_invoice RENAME TO idx_bank_import_records_invoice;

DROP POLICY IF EXISTS camt_import_records_service_role ON bank_import_records;
CREATE POLICY bank_import_records_service_role ON bank_import_records
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
