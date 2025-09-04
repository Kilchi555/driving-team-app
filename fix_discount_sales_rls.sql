-- Fix RLS policies for discount_sales table
-- Allow SELECT for all authenticated users
DROP POLICY IF EXISTS "Enable select for authenticated users" ON discount_sales;
CREATE POLICY "Enable select for authenticated users" ON discount_sales
FOR SELECT USING (auth.role() = 'authenticated');

-- Allow INSERT for all authenticated users  
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON discount_sales;
CREATE POLICY "Enable insert for authenticated users" ON discount_sales
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow UPDATE for all authenticated users
DROP POLICY IF EXISTS "Enable update for authenticated users" ON discount_sales;
CREATE POLICY "Enable update for authenticated users" ON discount_sales
FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow DELETE for all authenticated users
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON discount_sales;
CREATE POLICY "Enable delete for authenticated users" ON discount_sales
FOR DELETE USING (auth.role() = 'authenticated');

-- Fix RLS policies for product_sales table
-- Allow SELECT for all authenticated users
DROP POLICY IF EXISTS "Enable select for authenticated users" ON product_sales;
CREATE POLICY "Enable select for authenticated users" ON product_sales
FOR SELECT USING (auth.role() = 'authenticated');

-- Allow INSERT for all authenticated users  
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON product_sales;
CREATE POLICY "Enable insert for authenticated users" ON product_sales
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow UPDATE for all authenticated users
DROP POLICY IF EXISTS "Enable update for authenticated users" ON product_sales;
CREATE POLICY "Enable update for authenticated users" ON product_sales
FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow DELETE for all authenticated users
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON product_sales;
CREATE POLICY "Enable delete for authenticated users" ON product_sales
FOR DELETE USING (auth.role() = 'authenticated');