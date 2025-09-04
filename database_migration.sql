-- Neue Tabellen für Produktverkäufe (mit oder ohne Termin)
-- 1. Produktverkäufe Tabelle
CREATE TABLE IF NOT EXISTS product_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id), -- NULL wenn kein Termin
  user_id UUID REFERENCES users(id),
  staff_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_amount_rappen INTEGER NOT NULL,
  discount_amount_rappen INTEGER DEFAULT 0,
  discount_type VARCHAR(20) DEFAULT 'fixed',
  discount_reason TEXT,
  payment_method VARCHAR(20),
  status VARCHAR(20) DEFAULT 'pending',
  notes TEXT
);

-- 2. Produkte in einem Verkauf
CREATE TABLE IF NOT EXISTS product_sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_sale_id UUID REFERENCES product_sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price_rappen INTEGER NOT NULL,
  total_price_rappen INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Indizes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_product_sales_appointment_id ON product_sales(appointment_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_user_id ON product_sales(user_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_staff_id ON product_sales(staff_id);
CREATE INDEX IF NOT EXISTS idx_product_sale_items_product_sale_id ON product_sale_items(product_sale_id);
CREATE INDEX IF NOT EXISTS idx_product_sale_items_product_id ON product_sale_items(product_id);

-- 4. RLS Policies (Row Level Security)
ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sale_items ENABLE ROW LEVEL SECURITY;

-- Policy für product_sales: Staff können ihre eigenen Verkäufe sehen
CREATE POLICY "Staff can view their own product sales" ON product_sales
  FOR SELECT USING (auth.uid() = staff_id);

-- Policy für product_sales: Staff können Verkäufe erstellen
CREATE POLICY "Staff can create product sales" ON product_sales
  FOR INSERT WITH CHECK (auth.uid() = staff_id);

-- Policy für product_sales: Staff können ihre Verkäufe bearbeiten
CREATE POLICY "Staff can update their own product sales" ON product_sales
  FOR UPDATE USING (auth.uid() = staff_id);

-- Policy für product_sale_items: Staff können Items ihrer Verkäufe sehen
CREATE POLICY "Staff can view items of their product sales" ON product_sale_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM product_sales 
      WHERE product_sales.id = product_sale_items.product_sale_id 
      AND product_sales.staff_id = auth.uid()
    )
  );

-- Policy für product_sale_items: Staff können Items erstellen
CREATE POLICY "Staff can create product sale items" ON product_sale_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM product_sales 
      WHERE product_sales.id = product_sale_items.product_sale_id 
      AND product_sales.staff_id = auth.uid()
    )
  );

-- Policy für product_sale_items: Staff können Items bearbeiten
CREATE POLICY "Staff can update product sale items" ON product_sale_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM product_sales 
      WHERE product_sales.id = product_sale_items.product_sale_id 
      AND product_sales.staff_id = auth.uid()
    )
  );
