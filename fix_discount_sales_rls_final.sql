-- Fix RLS policies for discount_sales table
-- Diese Policy ermöglicht authenticated users Zugriff auf discount_sales

-- 1. RLS aktivieren falls noch nicht aktiviert
ALTER TABLE discount_sales ENABLE ROW LEVEL SECURITY;

-- 2. Alte Policies löschen
DROP POLICY IF EXISTS "Enable select for authenticated users" ON discount_sales;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON discount_sales;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON discount_sales;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON discount_sales;

-- 3. Neue Policies erstellen für authenticated users
CREATE POLICY "Enable select for authenticated users" ON discount_sales
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON discount_sales
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON discount_sales
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON discount_sales
FOR DELETE USING (auth.role() = 'authenticated');

-- 4. Gleiches für product_sales (falls auch dort Probleme auftreten)
ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable select for authenticated users" ON product_sales;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON product_sales;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON product_sales;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON product_sales;

CREATE POLICY "Enable select for authenticated users" ON product_sales
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON product_sales
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON product_sales
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON product_sales
FOR DELETE USING (auth.role() = 'authenticated');
