-- Migration: Create accounting tables for simple bookkeeping
-- Date: 2026-06-09
-- Description: Phase 1 – einfache Buchhaltung (OR Art. 957 Abs. 2)
--   - accounting_categories: Buchungskategorien pro Mandant
--   - accounting_entries: Ausgaben + manuelle Einnahmen
--   Note: Einnahmen aus Fahrschulbetrieb kommen aus bestehender payments-Tabelle

-- ─── 1. Kategorien ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS accounting_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  name VARCHAR(100) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  color VARCHAR(7) DEFAULT '#6366f1',

  -- Optional: MWST-Satz in Prozent (z.B. 8.1, 2.6, 0)
  vat_rate NUMERIC(5,2),

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  CONSTRAINT unique_category_name_per_tenant UNIQUE (tenant_id, name, type)
);

CREATE INDEX IF NOT EXISTS idx_accounting_categories_tenant ON accounting_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounting_categories_type ON accounting_categories(type);

ALTER TABLE accounting_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage accounting categories"
  ON accounting_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
      AND tenant_id = accounting_categories.tenant_id
    )
  );

-- ─── 2. Buchungseinträge ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS accounting_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Buchungstyp
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),

  -- Betrag in Rappen (CHF * 100)
  amount_rappen INTEGER NOT NULL CHECK (amount_rappen > 0),

  -- Buchungsdatum
  entry_date DATE NOT NULL,

  -- Beschreibung
  description VARCHAR(500) NOT NULL,

  -- Kategorie (optional, da Einnahmen aus payments keine Kategorie brauchen)
  category_id UUID REFERENCES accounting_categories(id) ON DELETE SET NULL,

  -- Beleg
  receipt_url TEXT,
  receipt_filename VARCHAR(255),

  -- MWST (optional)
  vat_rate NUMERIC(5,2),
  vat_amount_rappen INTEGER,

  -- QR-Rechnung Daten (JSON: iban, reference, creditor, etc.)
  qr_data JSONB,

  -- Zahlungsdetails für ausstehende Zahlungen
  creditor_name VARCHAR(255),
  creditor_iban VARCHAR(34),
  payment_reference VARCHAR(50),
  is_paid BOOLEAN DEFAULT false,
  paid_date DATE,

  -- Verknüpfung mit bestehendem Payment (für auto-importierte Einnahmen)
  linked_payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,

  -- Rechnungsnummer oder externe Referenz
  external_reference VARCHAR(100),

  -- Soft delete: OR-konforme Aufbewahrung (nie physisch löschen)
  deleted_at TIMESTAMPTZ,

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_accounting_entries_tenant ON accounting_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_date ON accounting_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_type ON accounting_entries(type);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_category ON accounting_entries(category_id);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_deleted ON accounting_entries(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_accounting_entries_tenant_date ON accounting_entries(tenant_id, entry_date DESC) WHERE deleted_at IS NULL;

ALTER TABLE accounting_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage accounting entries"
  ON accounting_entries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
      AND tenant_id = accounting_entries.tenant_id
    )
  );

-- ─── 3. Standardkategorien-Funktion ─────────────────────────────────────────
-- Wird per API nach Tenant-Erstellung aufgerufen

-- Keine automatischen INSERT in Migration, da tenant_id benötigt wird.
-- Stattdessen via API /admin/accounting/init-categories

-- ─── 4. Automatisches updated_at ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_accounting_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER accounting_categories_updated_at
  BEFORE UPDATE ON accounting_categories
  FOR EACH ROW EXECUTE FUNCTION update_accounting_updated_at();

CREATE TRIGGER accounting_entries_updated_at
  BEFORE UPDATE ON accounting_entries
  FOR EACH ROW EXECUTE FUNCTION update_accounting_updated_at();
