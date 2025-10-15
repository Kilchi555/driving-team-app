-- Import Tables for CSV Data Import
-- Created for flexible CSV import with separate archive tables

-- Upload Batches (for tracking, statistics, rollback)
CREATE TABLE IF NOT EXISTS imports_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  source TEXT,                     -- e.g. 'altes CRM'
  note TEXT,
  total_rows INTEGER,
  created_by UUID,                 -- users.id
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP             -- Soft delete
);

-- Imported Customers (Archive)
CREATE TABLE IF NOT EXISTS imported_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  batch_id UUID REFERENCES imports_batches(id) ON DELETE SET NULL,
  legacy_id TEXT,                  -- old system ID
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  birthdate DATE,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT,
  customer_number TEXT,
  created_at_original TIMESTAMP,   -- original date from CSV
  updated_at_original TIMESTAMP,
  raw_json JSONB NOT NULL,         -- full, unmapped row
  mapped_json JSONB,               -- normalized fields (optional)
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID,
  deleted_at TIMESTAMP             -- Soft delete
);

-- Imported Invoices/Payments (Archive)
CREATE TABLE IF NOT EXISTS imported_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  batch_id UUID REFERENCES imports_batches(id) ON DELETE SET NULL,
  legacy_id TEXT,
  number TEXT,                     -- order/invoice number
  title TEXT,                      -- title
  status TEXT,                     -- Paid/Draft/Cancelled...
  issued_at DATE,
  due_at DATE,
  total_amount NUMERIC(12,2),
  currency TEXT DEFAULT 'CHF',
  customer_name TEXT,
  customer_email TEXT,
  created_at_original TIMESTAMP,
  paid_at TIMESTAMP,
  raw_json JSONB NOT NULL,
  mapped_json JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID,
  deleted_at TIMESTAMP             -- Soft delete
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_imports_batches_tenant_id ON imports_batches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_imports_batches_created_at ON imports_batches(created_at);

CREATE INDEX IF NOT EXISTS idx_imported_customers_tenant_id ON imported_customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_imported_customers_email ON imported_customers(email);
CREATE INDEX IF NOT EXISTS idx_imported_customers_legacy_id ON imported_customers(legacy_id);
CREATE INDEX IF NOT EXISTS idx_imported_customers_batch_id ON imported_customers(batch_id);
CREATE INDEX IF NOT EXISTS idx_imported_customers_raw_json ON imported_customers USING GIN (raw_json);

CREATE INDEX IF NOT EXISTS idx_imported_invoices_tenant_id ON imported_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_imported_invoices_number ON imported_invoices(number);
CREATE INDEX IF NOT EXISTS idx_imported_invoices_customer_email ON imported_invoices(customer_email);
CREATE INDEX IF NOT EXISTS idx_imported_invoices_batch_id ON imported_invoices(batch_id);
CREATE INDEX IF NOT EXISTS idx_imported_invoices_raw_json ON imported_invoices USING GIN (raw_json);

-- RLS Policies
-- Only admins can access import data

-- imports_batches policies
ALTER TABLE imports_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view import batches" ON imports_batches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin' 
      AND users.tenant_id = imports_batches.tenant_id
    )
  );

CREATE POLICY "Admins can insert import batches" ON imports_batches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin' 
      AND users.tenant_id = imports_batches.tenant_id
    )
  );

CREATE POLICY "Admins can update import batches" ON imports_batches
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin' 
      AND users.tenant_id = imports_batches.tenant_id
    )
  );

-- imported_customers policies
ALTER TABLE imported_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view imported customers" ON imported_customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin' 
      AND users.tenant_id = imported_customers.tenant_id
    )
  );

CREATE POLICY "Admins can insert imported customers" ON imported_customers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin' 
      AND users.tenant_id = imported_customers.tenant_id
    )
  );

CREATE POLICY "Admins can update imported customers" ON imported_customers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.tenant_id = imported_customers.tenant_id
    )
  );

-- imported_invoices policies
ALTER TABLE imported_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view imported invoices" ON imported_invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin' 
      AND users.tenant_id = imported_invoices.tenant_id
    )
  );

CREATE POLICY "Admins can insert imported invoices" ON imported_invoices
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin' 
      AND users.tenant_id = imported_invoices.tenant_id
    )
  );

CREATE POLICY "Admins can update imported invoices" ON imported_invoices
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.tenant_id = imported_invoices.tenant_id
    )
  );

-- Comments
COMMENT ON TABLE imports_batches IS 'Tracks CSV import batches for statistics and rollback';
COMMENT ON TABLE imported_customers IS 'Archive table for imported customer data from old CRM';
COMMENT ON TABLE imported_invoices IS 'Archive table for imported invoice/payment data from old CRM';

COMMENT ON COLUMN imported_customers.raw_json IS 'Full CSV row as JSON for flexible column handling';
COMMENT ON COLUMN imported_customers.mapped_json IS 'Normalized fields (optional)';
COMMENT ON COLUMN imported_invoices.raw_json IS 'Full CSV row as JSON for flexible column handling';
COMMENT ON COLUMN imported_invoices.mapped_json IS 'Normalized fields (optional)';
