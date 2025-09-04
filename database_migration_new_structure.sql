-- Neue, saubere Datenbankstruktur für Zahlungen
-- Ersetzt die komplexe Struktur mit pricing_rules, product_sales, etc.

-- 1. Products Tabelle (Produktkatalog)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  price_rappen INTEGER NOT NULL,
  description TEXT,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Discounts Tabelle (Rabattkatalog)
CREATE TABLE IF NOT EXISTS discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  discount_type VARCHAR(50) NOT NULL, -- 'percentage', 'fixed'
  discount_value DECIMAL(10,2) NOT NULL,
  discount_reason TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Payments Tabelle (ALLE Zahlungen)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL, -- NULL wenn standalone
  payment_method VARCHAR(50) NOT NULL, -- 'cash', 'invoice', 'online'
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  total_amount_rappen INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'CHF',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Payment Items Tabelle (Einzelne Posten in einer Zahlung)
CREATE TABLE IF NOT EXISTS payment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  item_type VARCHAR(50) NOT NULL, -- 'appointment', 'product', 'discount'
  item_id UUID NOT NULL, -- Verweis auf appointments.id, products.id, oder discounts.id
  quantity INTEGER DEFAULT 1,
  unit_price_rappen INTEGER NOT NULL,
  total_price_rappen INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Indizes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_appointment_id ON payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payment_items_payment_id ON payment_items(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_items_item_type ON payment_items(item_type);
CREATE INDEX IF NOT EXISTS idx_payment_items_item_id ON payment_items(item_id);

-- 6. RLS Policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_items ENABLE ROW LEVEL SECURITY;

-- Products: Alle können lesen, nur Admins können bearbeiten
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);
CREATE POLICY "Products are insertable by admins" ON products FOR INSERT WITH CHECK (auth.role() = 'admin');
CREATE POLICY "Products are updatable by admins" ON products FOR UPDATE USING (auth.role() = 'admin');
CREATE POLICY "Products are deletable by admins" ON products FOR DELETE USING (auth.role() = 'admin');

-- Discounts: Alle können lesen, nur Admins können bearbeiten
CREATE POLICY "Discounts are viewable by everyone" ON discounts FOR SELECT USING (true);
CREATE POLICY "Discounts are insertable by admins" ON discounts FOR INSERT WITH CHECK (auth.role() = 'admin');
CREATE POLICY "Discounts are updatable by admins" ON discounts FOR UPDATE USING (auth.role() = 'admin');
CREATE POLICY "Discounts are deletable by admins" ON discounts FOR DELETE USING (auth.role() = 'admin');

-- Payments: Benutzer können ihre eigenen sehen, Staff kann alle sehen
CREATE POLICY "Users can view their own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Staff can view all payments" ON payments FOR SELECT USING (auth.role() = 'staff' OR auth.role() = 'admin');
CREATE POLICY "Users can create their own payments" ON payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff can create payments for users" ON payments FOR INSERT WITH CHECK (auth.role() = 'staff' OR auth.role() = 'admin');
CREATE POLICY "Staff can update payments" ON payments FOR UPDATE USING (auth.role() = 'staff' OR auth.role() = 'admin');
CREATE POLICY "Staff can delete payments" ON payments FOR DELETE USING (auth.role() = 'staff' OR auth.role() = 'admin');

-- Payment Items: Basierend auf der übergeordneten Payment
CREATE POLICY "Payment items are viewable based on payment access" ON payment_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM payments 
    WHERE payments.id = payment_items.payment_id 
    AND (auth.uid() = payments.user_id OR auth.role() IN ('staff', 'admin'))
  )
);
CREATE POLICY "Payment items are insertable by staff" ON payment_items FOR INSERT WITH CHECK (auth.role() IN ('staff', 'admin'));
CREATE POLICY "Payment items are updatable by staff" ON payment_items FOR UPDATE USING (auth.role() IN ('staff', 'admin'));
CREATE POLICY "Payment items are deletable by staff" ON payment_items FOR DELETE USING (auth.role() IN ('staff', 'admin'));

-- 7. Beispieldaten einfügen
INSERT INTO products (name, price_rappen, description, category) VALUES
('Fahrstunde B', 9500, '45 Minuten Fahrstunde für Kategorie B', 'Fahrstunden'),
('Fahrstunde A', 9500, '45 Minuten Fahrstunde für Kategorie A', 'Fahrstunden'),
('Fahrstunde BE', 12000, '45 Minuten Fahrstunde für Kategorie BE', 'Fahrstunden'),
('Theorieunterricht', 5000, '45 Minuten Theorieunterricht', 'Theorie'),
('Prüfungsvorbereitung', 8000, '45 Minuten Prüfungsvorbereitung', 'Theorie');

INSERT INTO discounts (name, discount_type, discount_value, discount_reason) VALUES
('Studentenrabatt', 'percentage', 10.00, '10% Rabatt für Studenten'),
('Paketrabatt', 'percentage', 15.00, '15% Rabatt bei Buchung von 10 Fahrstunden'),
('Frühbucherrabatt', 'fixed', 500, '5 CHF Rabatt bei Buchung 1 Woche im Voraus');

-- 8. Funktion für automatische Preisberechnung
CREATE OR REPLACE FUNCTION calculate_payment_total(payment_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total INTEGER := 0;
BEGIN
  SELECT COALESCE(SUM(total_price_rappen), 0)
  INTO total
  FROM payment_items
  WHERE payment_id = payment_uuid;
  
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger für automatische Aktualisierung des Gesamtbetrags
CREATE OR REPLACE FUNCTION update_payment_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE payments 
  SET total_amount_rappen = calculate_payment_total(NEW.payment_id),
      updated_at = NOW()
  WHERE id = NEW.payment_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_total
  AFTER INSERT OR UPDATE OR DELETE ON payment_items
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_total();

-- 10. Kommentare für bessere Dokumentation
COMMENT ON TABLE products IS 'Produktkatalog für alle verkäuflichen Artikel';
COMMENT ON TABLE discounts IS 'Rabattkatalog für verschiedene Rabattarten';
COMMENT ON TABLE payments IS 'Haupttabelle für alle Zahlungen (Termine + Standalone)';
COMMENT ON TABLE payment_items IS 'Einzelne Posten innerhalb einer Zahlung';
COMMENT ON COLUMN payments.appointment_id IS 'NULL wenn es sich um eine standalone Zahlung handelt';
COMMENT ON COLUMN payment_items.item_type IS 'Art des Items: appointment, product, oder discount';
