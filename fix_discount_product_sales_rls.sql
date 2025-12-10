-- Fix RLS for discount_sales and product_sales tables
-- Issue: 406 (Not Acceptable) errors due to missing RLS policies

-- ============================================
-- 1. Enable RLS on both tables (if not already enabled)
-- ============================================
ALTER TABLE discount_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. DROP existing policies (clean slate)
-- ============================================
DROP POLICY IF EXISTS "discount_sales_select" ON discount_sales;
DROP POLICY IF EXISTS "discount_sales_insert" ON discount_sales;
DROP POLICY IF EXISTS "discount_sales_update" ON discount_sales;
DROP POLICY IF EXISTS "discount_sales_delete" ON discount_sales;

DROP POLICY IF EXISTS "product_sales_select" ON product_sales;
DROP POLICY IF EXISTS "product_sales_insert" ON product_sales;
DROP POLICY IF EXISTS "product_sales_update" ON product_sales;
DROP POLICY IF EXISTS "product_sales_delete" ON product_sales;

-- ============================================
-- 3. CREATE RLS policies for discount_sales
-- ============================================

-- SELECT: Staff/Admins can see all, Clients can see their own
CREATE POLICY "discount_sales_select" ON discount_sales
  FOR SELECT
  TO authenticated
  USING (
    -- Admin/Staff can see all discount sales
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'tenant_admin', 'staff')
    )
    OR
    -- Clients can see discount sales for their own appointments
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = discount_sales.appointment_id
      AND appointments.user_id = auth.uid()
    )
  );

-- INSERT: Only Staff/Admins can create discount sales
CREATE POLICY "discount_sales_insert" ON discount_sales
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'tenant_admin', 'staff')
    )
  );

-- UPDATE: Only Staff/Admins can update discount sales
CREATE POLICY "discount_sales_update" ON discount_sales
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'tenant_admin', 'staff')
    )
  );

-- DELETE: Only Admins can delete discount sales
CREATE POLICY "discount_sales_delete" ON discount_sales
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'tenant_admin')
    )
  );

-- ============================================
-- 4. CREATE RLS policies for product_sales
-- ============================================

-- SELECT: Staff/Admins can see all, Clients can see their own
CREATE POLICY "product_sales_select" ON product_sales
  FOR SELECT
  TO authenticated
  USING (
    -- Admin/Staff can see all product sales
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'tenant_admin', 'staff')
    )
    OR
    -- Clients can see product sales for their own appointments
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = product_sales.appointment_id
      AND appointments.user_id = auth.uid()
    )
  );

-- INSERT: Only Staff/Admins can create product sales
CREATE POLICY "product_sales_insert" ON product_sales
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'tenant_admin', 'staff')
    )
  );

-- UPDATE: Only Staff/Admins can update product sales
CREATE POLICY "product_sales_update" ON product_sales
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'tenant_admin', 'staff')
    )
  );

-- DELETE: Only Admins can delete product sales
CREATE POLICY "product_sales_delete" ON product_sales
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'tenant_admin')
    )
  );

-- ============================================
-- 5. Verify policies
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command
FROM pg_policies 
WHERE tablename IN ('discount_sales', 'product_sales')
ORDER BY tablename, cmd, policyname;

-- Expected output: 8 policies total (4 for each table)
-- Each table should have: SELECT, INSERT, UPDATE, DELETE policies

