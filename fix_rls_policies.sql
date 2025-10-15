-- Fix RLS Policies for discounts and invited_customers tables
-- This addresses 406 (Not Acceptable) errors in Supabase

-- Check current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('discounts', 'invited_customers');

-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('discounts', 'invited_customers');

-- Drop existing policies if they exist (to recreate them properly)
DROP POLICY IF EXISTS "discounts_select_policy" ON discounts;
DROP POLICY IF EXISTS "discounts_insert_policy" ON discounts;
DROP POLICY IF EXISTS "discounts_update_policy" ON discounts;
DROP POLICY IF EXISTS "discounts_delete_policy" ON discounts;

DROP POLICY IF EXISTS "invited_customers_select_policy" ON invited_customers;
DROP POLICY IF EXISTS "invited_customers_insert_policy" ON invited_customers;
DROP POLICY IF EXISTS "invited_customers_update_policy" ON invited_customers;
DROP POLICY IF EXISTS "invited_customers_delete_policy" ON invited_customers;

-- Enable RLS if not already enabled
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invited_customers ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies for discounts table
CREATE POLICY "discounts_select_policy" ON discounts
    FOR SELECT
    TO authenticated
    USING (
        tenant_id IN (
            SELECT tenant_id 
            FROM users 
            WHERE auth_user_id = auth.uid() 
            AND is_active = true
        )
    );

CREATE POLICY "discounts_insert_policy" ON discounts
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id 
            FROM users 
            WHERE auth_user_id = auth.uid() 
            AND is_active = true
        )
    );

CREATE POLICY "discounts_update_policy" ON discounts
    FOR UPDATE
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

CREATE POLICY "discounts_delete_policy" ON discounts
    FOR DELETE
    TO authenticated
    USING (
        tenant_id IN (
            SELECT tenant_id 
            FROM users 
            WHERE auth_user_id = auth.uid() 
            AND is_active = true
        )
    );

-- Create comprehensive RLS policies for invited_customers table
CREATE POLICY "invited_customers_select_policy" ON invited_customers
    FOR SELECT
    TO authenticated
    USING (
        tenant_id IN (
            SELECT tenant_id 
            FROM users 
            WHERE auth_user_id = auth.uid() 
            AND is_active = true
        )
    );

CREATE POLICY "invited_customers_insert_policy" ON invited_customers
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id 
            FROM users 
            WHERE auth_user_id = auth.uid() 
            AND is_active = true
        )
    );

CREATE POLICY "invited_customers_update_policy" ON invited_customers
    FOR UPDATE
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

CREATE POLICY "invited_customers_delete_policy" ON invited_customers
    FOR DELETE
    TO authenticated
    USING (
        tenant_id IN (
            SELECT tenant_id 
            FROM users 
            WHERE auth_user_id = auth.uid() 
            AND is_active = true
        )
    );

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('discounts', 'invited_customers')
ORDER BY tablename, policyname;
