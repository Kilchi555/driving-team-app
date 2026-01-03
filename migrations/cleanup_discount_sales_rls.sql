-- CLEAN UP ALL EXISTING DISCOUNT_SALES POLICIES FIRST
-- Then apply new safe policies

-- Step 1: Drop ALL existing policies (they're causing conflicts)
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON discount_sales;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON discount_sales;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON discount_sales;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON discount_sales;
DROP POLICY IF EXISTS "Service role delete discount_sales" ON discount_sales;
DROP POLICY IF EXISTS "Service role insert discount_sales" ON discount_sales;
DROP POLICY IF EXISTS "Service role read discount_sales" ON discount_sales;
DROP POLICY IF EXISTS "Service role update discount_sales" ON discount_sales;
DROP POLICY IF EXISTS "discount_sales_tenant_access" ON discount_sales;
DROP POLICY IF EXISTS "Discount sales select" ON discount_sales;
DROP POLICY IF EXISTS "Discount sales insert" ON discount_sales;
DROP POLICY IF EXISTS "Discount sales update" ON discount_sales;
DROP POLICY IF EXISTS "Users can read discount sales" ON discount_sales;

-- Step 2: Enable RLS
ALTER TABLE discount_sales ENABLE ROW LEVEL SECURITY;

-- Step 3: Create ONLY ONE safe policy - Service role only
CREATE POLICY "Service role full access" ON discount_sales
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Step 4: Verify - should show only 1 policy
SELECT policyname, cmd FROM pg_policies WHERE tablename='discount_sales' ORDER BY policyname;

