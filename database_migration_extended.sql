-- Erweiterte Datenbankstruktur für Produkte und Rabatte (mit und ohne Termin)
-- Erstellt: 2024-12-19

-- 1. Payments Tabelle (Haupttabelle für alle Zahlungen)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL, -- NULL für standalone
  payment_method VARCHAR(50) NOT NULL, -- 'cash', 'invoice', 'online', 'wallee'
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'cancelled'
  total_amount_rappen INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'CHF',
  description TEXT,
  is_standalone BOOLEAN DEFAULT false, -- true wenn kein Termin
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Payment Items Tabelle (Einzelposten in einer Zahlung)
CREATE TABLE IF NOT EXISTS payment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  item_type VARCHAR(50) NOT NULL, -- 'appointment', 'product', 'discount', 'service'
  item_id UUID, -- Verweis auf die jeweilige Tabelle (kann NULL sein für manuelle Einträge)
  item_name VARCHAR(255) NOT NULL, -- Name für Anzeige
  quantity INTEGER DEFAULT 1,
  unit_price_rappen INTEGER NOT NULL,
  total_price_rappen INTEGER NOT NULL,
  description TEXT,
  metadata JSONB, -- Zusätzliche Daten (z.B. Gutschein-Empfänger)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Products Tabelle (Produktkatalog)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  price_rappen INTEGER NOT NULL,
  description TEXT,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  is_voucher BOOLEAN DEFAULT false, -- Für Gutscheine
  allow_custom_amount BOOLEAN DEFAULT false, -- Für individuelle Beträge
  min_amount_rappen INTEGER DEFAULT 0,
  max_amount_rappen INTEGER,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Discounts Tabelle (Rabattkatalog)
CREATE TABLE IF NOT EXISTS discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE, -- Optionaler Gutscheincode
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free_lesson', 'free_product')),
  discount_value DECIMAL(10,2) NOT NULL,
  min_amount_rappen INTEGER DEFAULT 0,
  max_discount_rappen INTEGER,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  applies_to VARCHAR(50) DEFAULT 'all', -- 'all', 'appointments', 'products', 'services'
  category_filter VARCHAR(100),
  staff_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Indizes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_appointment_id ON payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_standalone ON payments(is_standalone);
CREATE INDEX IF NOT EXISTS idx_payment_items_payment_id ON payment_items(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_items_item_type ON payment_items(item_type);
CREATE INDEX IF NOT EXISTS idx_payment_items_item_id ON payment_items(item_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_voucher ON products(is_voucher);
CREATE INDEX IF NOT EXISTS idx_discounts_code ON discounts(code);
CREATE INDEX IF NOT EXISTS idx_discounts_active ON discounts(is_active);
CREATE INDEX IF NOT EXISTS idx_discounts_validity ON discounts(valid_from, valid_until);

-- 6. RLS Policies (Row Level Security)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;

-- Payments: Benutzer können ihre eigenen sehen, Staff kann alle sehen
CREATE POLICY "Users can view their own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Staff can view all payments" ON payments FOR SELECT USING (auth.role() IN ('staff', 'admin'));
CREATE POLICY "Users can create their own payments" ON payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff can create payments for users" ON payments FOR INSERT WITH CHECK (auth.role() IN ('staff', 'admin'));
CREATE POLICY "Staff can update payments" ON payments FOR UPDATE USING (auth.role() IN ('staff', 'admin'));
CREATE POLICY "Staff can delete payments" ON payments FOR DELETE USING (auth.role() IN ('staff', 'admin'));

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

-- 7. Funktionen für automatische Berechnungen
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

-- Funktion für Rabattberechnung
CREATE OR REPLACE FUNCTION calculate_discount(
  p_amount_rappen INTEGER,
  p_discount_id UUID
) RETURNS INTEGER AS $$
DECLARE
  discount_record RECORD;
  discount_amount INTEGER := 0;
BEGIN
  SELECT * INTO discount_record FROM discounts WHERE id = p_discount_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Prüfe Gültigkeitszeitraum
  IF discount_record.valid_until IS NOT NULL AND NOW() > discount_record.valid_until THEN
    RETURN 0;
  END IF;
  
  -- Prüfe Mindestbetrag
  IF p_amount_rappen < discount_record.min_amount_rappen THEN
    RETURN 0;
  END IF;
  
  -- Berechne Rabatt
  CASE discount_record.discount_type
    WHEN 'percentage' THEN
      discount_amount := (p_amount_rappen * discount_record.discount_value) / 100;
    WHEN 'fixed' THEN
      discount_amount := discount_record.discount_value * 100; -- Konvertiere zu Rappen
    WHEN 'free_lesson' THEN
      discount_amount := p_amount_rappen;
    WHEN 'free_product' THEN
      discount_amount := p_amount_rappen;
    ELSE
      discount_amount := 0;
  END CASE;
  
  -- Begrenze auf maximalen Rabatt
  IF discount_record.max_discount_rappen IS NOT NULL AND discount_amount > discount_record.max_discount_rappen THEN
    discount_amount := discount_record.max_discount_rappen;
  END IF;
  
  RETURN LEAST(discount_amount, p_amount_rappen);
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger für automatische Aktualisierung
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

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_timestamp
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_product_timestamp
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_discount_timestamp
  BEFORE UPDATE ON discounts
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- 9. Beispieldaten einfügen
INSERT INTO products (name, price_rappen, description, category, is_voucher, allow_custom_amount) VALUES
('Fahrstunde B', 9500, '45 Minuten Fahrstunde für Kategorie B', 'Fahrstunden', false, false),
('Fahrstunde A', 9500, '45 Minuten Fahrstunde für Kategorie A', 'Fahrstunden', false, false),
('Fahrstunde BE', 12000, '45 Minuten Fahrstunde für Kategorie BE', 'Fahrstunden', false, false),
('Theorieunterricht', 5000, '45 Minuten Theorieunterricht', 'Theorie', false, false),
('Prüfungsvorbereitung', 8000, '45 Minuten Prüfungsvorbereitung', 'Theorie', false, false),
('Gutschein CHF 50', 5000, 'Gutschein im Wert von CHF 50.00', 'Gutscheine', true, false),
('Gutschein CHF 100', 10000, 'Gutschein im Wert von CHF 100.00', 'Gutscheine', true, false),
('Individueller Gutschein', 0, 'Gutschein mit individuellem Betrag', 'Gutscheine', true, true),
('Fahrschul-T-Shirt', 3500, 'T-Shirt mit Fahrschul-Logo', 'Merchandise', false, false),
('Fahrschul-Cap', 2500, 'Cap mit Fahrschul-Logo', 'Merchandise', false, false);

INSERT INTO discounts (name, code, discount_type, discount_value, min_amount_rappen, max_discount_rappen, applies_to, category_filter) VALUES
('Studentenrabatt 10%', 'STUDENT10', 'percentage', 10.00, 5000, 2000, 'appointments', 'B'),
('Paketrabatt 15%', 'PACKAGE15', 'percentage', 15.00, 50000, 5000, 'appointments', 'all'),
('Frühbucherrabatt CHF 5', 'EARLY5', 'fixed', 5.00, 10000, 500, 'appointments', 'all'),
('Geburtstags-Gutschein CHF 20', 'BIRTHDAY20', 'fixed', 20.00, 0, 2000, 'all', 'all'),
('Kategorie A Rabatt', 'CATEGORYA', 'percentage', 5.00, 0, 1000, 'appointments', 'A'),
('Shop-Rabatt 5%', 'SHOP5', 'percentage', 5.00, 2000, 1000, 'products', 'all'),
('Treuekunden-Rabatt', 'LOYALTY10', 'percentage', 10.00, 10000, 3000, 'all', 'all');

-- 10. Kommentare für bessere Dokumentation
COMMENT ON TABLE payments IS 'Haupttabelle für alle Zahlungen (Termine + Standalone)';
COMMENT ON TABLE payment_items IS 'Einzelne Posten innerhalb einer Zahlung';
COMMENT ON TABLE products IS 'Produktkatalog für alle verkäuflichen Artikel';
COMMENT ON TABLE discounts IS 'Rabattkatalog für verschiedene Rabattarten';
COMMENT ON COLUMN payments.appointment_id IS 'NULL wenn es sich um eine standalone Zahlung handelt';
COMMENT ON COLUMN payments.is_standalone IS 'true wenn keine Termin-gebundene Zahlung';
COMMENT ON COLUMN payment_items.item_type IS 'Art des Items: appointment, product, discount, oder service';
COMMENT ON COLUMN products.is_voucher IS 'true wenn es sich um einen Gutschein handelt';
COMMENT ON COLUMN products.allow_custom_amount IS 'true wenn individueller Betrag erlaubt ist';
COMMENT ON COLUMN discounts.code IS 'Optionaler Gutscheincode für Kunden';
COMMENT ON COLUMN discounts.applies_to IS 'Worauf der Rabatt angewendet werden kann';
