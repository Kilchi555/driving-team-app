-- Clean RLS Policies - Remove all conflicting policies and create clean ones
-- This will fix the 406 (Not Acceptable) errors

-- First, let's see what we have
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('discounts', 'invited_customers')
ORDER BY tablename, policyname;

-- Remove ALL existing policies for discounts table
DROP POLICY IF EXISTS "Allow all authenticated users access to discounts" ON discounts;
DROP POLICY IF EXISTS "Staff can manage all vouchers" ON discounts;
DROP POLICY IF EXISTS "Staff can redeem vouchers" ON discounts;
DROP POLICY IF EXISTS "Users can view their own vouchers" ON discounts;
DROP POLICY IF EXISTS "discounts_delete_policy" ON discounts;
DROP POLICY IF EXISTS "discounts_insert_policy" ON discounts;
DROP POLICY IF EXISTS "discounts_secure_tenant_isolation" ON discounts;
DROP POLICY IF EXISTS "discounts_select_policy" ON discounts;
DROP POLICY IF EXISTS "discounts_update_policy" ON discounts;

-- Remove ALL existing policies for invited_customers table
DROP POLICY IF EXISTS "invited_customers_delete_policy" ON invited_customers;
DROP POLICY IF EXISTS "invited_customers_insert_policy" ON invited_customers;
DROP POLICY IF EXISTS "invited_customers_select_policy" ON invited_customers;
DROP POLICY IF EXISTS "invited_customers_tenant_access" ON invited_customers;
DROP POLICY IF EXISTS "invited_customers_update_policy" ON invited_customers;

-- Enable RLS (should already be enabled, but just in case)
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invited_customers ENABLE ROW LEVEL SECURITY;

-- Create SINGLE, CLEAN policies for discounts table
-- One policy that handles ALL operations with proper tenant isolation
CREATE POLICY "discounts_tenant_isolation" ON discounts
    FOR ALL
    TO authenticated
    USING (
        -- Allow access if user's tenant_id matches the discount's tenant_id
        tenant_id IN (
            SELECT tenant_id 
            FROM users 
            WHERE auth_user_id = auth.uid() 
            AND is_active = true
        )
        OR
        -- Special case for vouchers: allow access if user is the buyer or recipient
        (is_voucher = true AND (
            voucher_buyer_email = (auth.jwt() ->> 'email')
            OR voucher_recipient_email = (auth.jwt() ->> 'email')
        ))
    )
    WITH CHECK (
        -- Same conditions for INSERT/UPDATE
        tenant_id IN (
            SELECT tenant_id 
            FROM users 
            WHERE auth_user_id = auth.uid() 
            AND is_active = true
        )
        OR
        -- Special case for vouchers
        (is_voucher = true AND (
            voucher_buyer_email = (auth.jwt() ->> 'email')
            OR voucher_recipient_email = (auth.jwt() ->> 'email')
        ))
    );

-- Create SINGLE, CLEAN policy for invited_customers table
CREATE POLICY "invited_customers_tenant_isolation" ON invited_customers
    FOR ALL
    TO authenticated
    USING (
        tenant_id IN (
            SELECT tenant_id 
            FROM users 
            WHERE auth_user_id = auth.uid() 
            AND is_active = true
        )
    )
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id 
            FROM users 
            WHERE auth_user_id = auth.uid() 
            AND is_active = true
        )
    );

-- Verify the clean policies
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('discounts', 'invited_customers')
ORDER BY tablename, policyname;

-- Test the policies work
SELECT 'Testing discounts access...' as test;
SELECT COUNT(*) as discount_count FROM discounts;

SELECT 'Testing invited_customers access...' as test;
SELECT COUNT(*) as customer_count FROM invited_customers;
