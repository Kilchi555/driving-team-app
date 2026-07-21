-- 20260721_camt_import_dedup.sql
-- Verhindert, dass dieselbe Bank-Transaktion aus einer CAMT-Datei zweimal als
-- Zahlung verbucht wird (z.B. wenn ein Kontoauszug versehentlich zweimal
-- importiert wird, oder sich zwei exportierte Zeiträume überlappen).

CREATE TABLE IF NOT EXISTS camt_import_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- Bank-eigene Transaktionsreferenz (AcctSvcrRef/NtryRef) falls vorhanden,
  -- sonst ein Fallback-Schlüssel aus Datum+Betrag+Referenz+Auftraggeber.
  dedupe_key TEXT NOT NULL,
  bank_ref TEXT,
  entry_date DATE,
  amount_rappen BIGINT NOT NULL,
  reference TEXT,
  debtor_name TEXT,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  imported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_camt_import_records_tenant ON camt_import_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_camt_import_records_invoice ON camt_import_records(invoice_id);

ALTER TABLE camt_import_records ENABLE ROW LEVEL SECURITY;

-- Nur der Server (service_role) liest/schreibt diese Tabelle direkt;
-- Autorisierung (Admin-Rolle, Tenant-Zugehörigkeit) erfolgt in der API-Schicht.
DROP POLICY IF EXISTS camt_import_records_service_role ON camt_import_records;
CREATE POLICY camt_import_records_service_role ON camt_import_records
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
