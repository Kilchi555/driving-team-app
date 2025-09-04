-- Erweiterte Datenbankstruktur - Bestehende Tabellen erweitern
-- Erstellt: 2024-12-19
-- Basis: Bestehende Tabellen erweitern anstatt neue zu erstellen

-- 1. Payments Tabelle erweitern (bestehende Tabelle)
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS is_standalone BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Neue Discounts Tabelle hinzufügen
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

-- 3. Payment Items Tabelle hinzufügen (für einzelne Posten)
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

-- 4. Products Tabelle erweitern (falls noch nicht vorhanden)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS min_amount_rappen INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_amount_rappen INTEGER,
ADD COLUMN IF NOT EXISTS allow_custom_amount BOOLEAN DEFAULT false;

-- 5. Indizes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_payments_standalone ON payments(is_standalone);
CREATE INDEX IF NOT EXISTS idx_payment_items_payment_id ON payment_items(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_items_item_type ON payment_items(item_type);
CREATE INDEX IF NOT EXISTS idx_payment_items_item_id ON payment_items(item_id);
CREATE INDEX IF NOT EXISTS idx_discounts_code ON discounts(code);
CREATE INDEX IF NOT EXISTS idx_discounts_active ON discounts(is_active);
CREATE INDEX IF NOT EXISTS idx_discounts_validity ON discounts(valid_from, valid_until);

-- 6. RLS Policies für neue Tabellen
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_items ENABLE ROW LEVEL SECURITY;

-- Discounts: Alle können lesen, nur Admins können bearbeiten
CREATE POLICY "Discounts are viewable by everyone" ON discounts FOR SELECT USING (true);
CREATE POLICY "Discounts are insertable by admins" ON discounts FOR INSERT WITH CHECK (auth.role() = 'admin');
CREATE POLICY "Discounts are updatable by admins" ON discounts FOR UPDATE USING (auth.role() = 'admin');
CREATE POLICY "Discounts are deletable by admins" ON discounts FOR DELETE USING (auth.role() = 'admin');

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

CREATE TRIGGER trigger_update_discount_timestamp
  BEFORE UPDATE ON discounts
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- 9. Beispieldaten für Discounts einfügen
INSERT INTO discounts (name, code, discount_type, discount_value, min_amount_rappen, max_discount_rappen, applies_to, category_filter) VALUES
('Studentenrabatt 10%', 'STUDENT10', 'percentage', 10.00, 5000, 2000, 'appointments', 'B'),
('Paketrabatt 15%', 'PACKAGE15', 'percentage', 15.00, 50000, 5000, 'appointments', 'all'),
('Frühbucherrabatt CHF 5', 'EARLY5', 'fixed', 5.00, 10000, 500, 'appointments', 'all'),
('Geburtstags-Gutschein CHF 20', 'BIRTHDAY20', 'fixed', 20.00, 0, 2000, 'all', 'all'),
('Kategorie A Rabatt', 'CATEGORYA', 'percentage', 5.00, 0, 1000, 'appointments', 'A'),
('Shop-Rabatt 5%', 'SHOP5', 'percentage', 5.00, 2000, 1000, 'products', 'all'),
('Treuekunden-Rabatt', 'LOYALTY10', 'percentage', 10.00, 10000, 3000, 'all', 'all')
ON CONFLICT (code) DO NOTHING;

-- 10. Kommentare für bessere Dokumentation
COMMENT ON COLUMN payments.is_standalone IS 'true wenn keine Termin-gebundene Zahlung';
COMMENT ON COLUMN payment_items.item_type IS 'Art des Items: appointment, product, discount, oder service';
COMMENT ON COLUMN discounts.code IS 'Optionaler Gutscheincode für Kunden';
COMMENT ON COLUMN discounts.applies_to IS 'Worauf der Rabatt angewendet werden kann';
COMMENT ON COLUMN products.allow_custom_amount IS 'true wenn individueller Betrag erlaubt ist';

-- 11. Bestehende Constraints anpassen (falls nötig)
-- Payments Tabelle: appointment_id kann NULL sein für standalone Zahlungen
ALTER TABLE payments ALTER COLUMN appointment_id DROP NOT NULL;

-- 12. Neue Zahlungsmethoden hinzufügen (falls noch nicht vorhanden)
INSERT INTO payment_methods (method_code, display_name, description, icon_name, is_active, is_online, display_order) VALUES
('wallee', 'Online-Zahlung', 'Sichere Online-Zahlung über Wallee', 'credit-card', true, true, 1),
('apple_pay', 'Apple Pay', 'Zahlung mit Apple Pay', 'apple', true, true, 2),
('google_pay', 'Google Pay', 'Zahlung mit Google Pay', 'google', true, true, 3)
ON CONFLICT (method_code) DO NOTHING;

