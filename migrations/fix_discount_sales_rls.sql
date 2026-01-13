-- Fix RLS policies for discount_sales table
-- IMPORTANT: discount_sales is now accessed ONLY via secure backend APIs
-- Frontend uses /api/discounts/save (with service_role backend)
-- No direct authenticated user access needed

-- Drop ALL existing policies first (be thorough)
DROP POLICY IF EXISTS "Service role full access" ON discount_sales;
DROP POLICY IF EXISTS "Service role full access to discount_sales" ON discount_sales;
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
DROP POLICY IF EXISTS "authenticated_tenant_access" ON discount_sales;
DROP POLICY IF EXISTS "Authenticated users can read their own discount sales" ON discount_sales;
DROP POLICY IF EXISTS "Authenticated users can update their own discount sales" ON discount_sales;
DROP POLICY IF EXISTS "Super admin full access to discount_sales" ON discount_sales;

-- Enable RLS
ALTER TABLE discount_sales ENABLE ROW LEVEL SECURITY;

-- Policy: Service role ONLY - for secure backend APIs
-- Frontend never directly accesses discount_sales
CREATE POLICY "service_role_all_access" ON discount_sales
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Verify policies
SELECT tablename, policyname, cmd FROM pg_policies
WHERE tablename = 'discount_sales'
ORDER BY policyname;
