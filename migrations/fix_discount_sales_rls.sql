-- FIX DISCOUNT_SALES RLS POLICIES
-- These are causing 406 errors when loading discount info

-- Step 1: Drop existing policies
DROP POLICY IF EXISTS "Discount sales select" ON discount_sales;
DROP POLICY IF EXISTS "Discount sales insert" ON discount_sales;
DROP POLICY IF EXISTS "Discount sales update" ON discount_sales;
DROP POLICY IF EXISTS "Users can read discount sales" ON discount_sales;

-- Step 2: Enable RLS if not already enabled
ALTER TABLE discount_sales ENABLE ROW LEVEL SECURITY;

-- Step 3: Create safe policies

-- Policy 1: Service role can read all
CREATE POLICY "Service role read discount_sales" ON discount_sales
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Policy 2: Service role can insert
CREATE POLICY "Service role insert discount_sales" ON discount_sales
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Policy 3: Service role can update
CREATE POLICY "Service role update discount_sales" ON discount_sales
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policy 4: Service role can delete
CREATE POLICY "Service role delete discount_sales" ON discount_sales
  FOR DELETE
  USING (auth.role() = 'service_role');

-- Step 4: Verify
SELECT policyname, cmd FROM pg_policies WHERE tablename='discount_sales' ORDER BY policyname;

