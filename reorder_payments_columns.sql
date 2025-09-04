-- Reorder payments table columns
-- Erstellt: 2025-08-14
-- Zweck: Preis-Spalten nach staff_id gruppieren

-- 1. Neue Tabelle mit gewünschter Spaltenreihenfolge erstellen
CREATE TABLE payments_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id),
  user_id UUID REFERENCES users(id),
  staff_id UUID REFERENCES users(id),
  lesson_price_rappen INTEGER DEFAULT 0,
  admin_fee_rappen INTEGER DEFAULT 0,
  products_price_rappen INTEGER DEFAULT 0,
  discount_amount_rappen INTEGER DEFAULT 0,
  total_amount_rappen INTEGER DEFAULT 0,
  amount_rappen INTEGER DEFAULT 0,
  payment_method VARCHAR(20),
  payment_status VARCHAR(20) DEFAULT 'pending',
  payment_provider VARCHAR(50),
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  twint_transaction_id VARCHAR(255),
  paid_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  currency VARCHAR(3) DEFAULT 'CHF',
  description TEXT,
  metadata JSONB,
  invoice_number VARCHAR(100),
  invoice_address JSONB,
  due_date TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),
  notes TEXT,
  company_billing_address_id UUID REFERENCES company_billing_addresses(id),
  is_standalone BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Alle Daten von der alten Tabelle kopieren (einfache Methode)
INSERT INTO payments_new 
SELECT 
  p.id,
  p.appointment_id,
  p.user_id,
  p.staff_id,
  COALESCE(p.lesson_price_rappen, 0) as lesson_price_rappen,
  COALESCE(p.admin_fee_rappen, 0) as admin_fee_rappen,
  COALESCE(p.products_price_rappen, 0) as products_price_rappen,
  COALESCE(p.discount_amount_rappen, 0) as discount_amount_rappen,
  COALESCE(p.total_amount_rappen, 0) as total_amount_rappen,
  COALESCE(p.amount_rappen, 0) as amount_rappen,
  p.payment_method,
  p.payment_status,
  p.payment_provider,
  p.stripe_payment_intent_id,
  p.stripe_charge_id,
  p.twint_transaction_id,
  p.paid_at,
  p.refunded_at,
  p.currency,
  p.description,
  p.metadata,
  p.invoice_number,
  p.invoice_address,
  p.due_date,
  p.created_by,
  p.notes,
  p.company_billing_address_id,
  p.is_standalone,
  p.created_at,
  p.updated_at
FROM payments p;

-- 3. Indizes und Constraints kopieren (falls vorhanden)
-- (Diese müssen manuell angepasst werden, falls sie spezifische Spaltenreferenzen haben)

-- 4. Alte Tabelle umbenennen und neue Tabelle aktivieren
ALTER TABLE payments RENAME TO payments_old;
ALTER TABLE payments_new RENAME TO payments;

-- 5. RLS (Row Level Security) aktivieren
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 6. Kommentar hinzufügen
COMMENT ON TABLE payments IS 'Payments table with reordered columns - price columns grouped after staff_id';

-- 7. Überprüfung
SELECT column_name, data_type, ordinal_position 
FROM information_schema.columns 
WHERE table_name = 'payments' 
ORDER BY ordinal_position;
