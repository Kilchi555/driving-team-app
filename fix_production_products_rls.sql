-- SQL-Befehl zum Ausführen in der Supabase-Produktionsdatenbank
-- Gehe zu: https://unyjaetebnaexaflpyoc.supabase.co/project/default/sql
-- Führe diesen Befehl aus:

-- 1. RLS für appointment_products aktivieren (falls noch nicht aktiviert)
ALTER TABLE appointment_products ENABLE ROW LEVEL SECURITY;

-- 2. RLS-Policies für appointment_products erstellen
DROP POLICY IF EXISTS "Appointment products are viewable by everyone" ON appointment_products;
DROP POLICY IF EXISTS "Appointment products are insertable by authenticated users" ON appointment_products;
DROP POLICY IF EXISTS "Appointment products are updatable by authenticated users" ON appointment_products;
DROP POLICY IF EXISTS "Appointment products are deletable by authenticated users" ON appointment_products;

CREATE POLICY "Appointment products are viewable by everyone" ON appointment_products 
  FOR SELECT USING (true);

CREATE POLICY "Appointment products are insertable by authenticated users" ON appointment_products 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Appointment products are updatable by authenticated users" ON appointment_products 
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Appointment products are deletable by authenticated users" ON appointment_products 
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- 3. RLS für products aktivieren (falls noch nicht aktiviert)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 4. RLS-Policies für products erstellen
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
DROP POLICY IF EXISTS "Products are insertable by staff" ON products;
DROP POLICY IF EXISTS "Products are updatable by staff" ON products;
DROP POLICY IF EXISTS "Products are deletable by staff" ON products;

CREATE POLICY "Products are viewable by everyone" ON products 
  FOR SELECT USING (true);

CREATE POLICY "Products are insertable by authenticated users" ON products 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Products are updatable by authenticated users" ON products 
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Products are deletable by authenticated users" ON products 
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- 5. RLS für product_sales aktivieren (falls noch nicht aktiviert)
ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;

-- 6. RLS-Policies für product_sales erstellen
DROP POLICY IF EXISTS "Product sales are viewable by everyone" ON product_sales;
DROP POLICY IF EXISTS "Product sales are insertable by staff" ON product_sales;
DROP POLICY IF EXISTS "Product sales are updatable by staff" ON product_sales;
DROP POLICY IF EXISTS "Product sales are deletable by staff" ON product_sales;

CREATE POLICY "Product sales are viewable by everyone" ON product_sales 
  FOR SELECT USING (true);

CREATE POLICY "Product sales are insertable by authenticated users" ON product_sales 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Product sales are updatable by authenticated users" ON product_sales 
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Product sales are deletable by authenticated users" ON product_sales 
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- 7. RLS für product_sale_items aktivieren (falls noch nicht aktiviert)
ALTER TABLE product_sale_items ENABLE ROW LEVEL SECURITY;

-- 8. RLS-Policies für product_sale_items erstellen
DROP POLICY IF EXISTS "Product sale items are viewable by everyone" ON product_sale_items;
DROP POLICY IF EXISTS "Product sale items are insertable by staff" ON product_sale_items;
DROP POLICY IF EXISTS "Product sale items are updatable by staff" ON product_sale_items;
DROP POLICY IF EXISTS "Product sale items are deletable by staff" ON product_sale_items;

CREATE POLICY "Product sale items are viewable by everyone" ON product_sale_items 
  FOR SELECT USING (true);

CREATE POLICY "Product sale items are insertable by authenticated users" ON product_sale_items 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Product sale items are updatable by authenticated users" ON product_sale_items 
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Product sale items are deletable by authenticated users" ON product_sale_items 
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- 9. Bestätigung
SELECT 'Alle produktbezogenen RLS-Policies wurden erfolgreich aktualisiert!' as status;
