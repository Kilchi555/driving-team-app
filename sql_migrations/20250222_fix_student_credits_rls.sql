-- Fix RLS policies for student_credits table
-- Allow clients to UPDATE their own credit balance

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all authenticated access to student_credits" ON student_credits;
DROP POLICY IF EXISTS "Users can view their own credits" ON student_credits;
DROP POLICY IF EXISTS "Staff can view their students credits" ON student_credits;
DROP POLICY IF EXISTS "Admins can view all credits" ON student_credits;
DROP POLICY IF EXISTS "Staff can manage their students credits" ON student_credits;
DROP POLICY IF EXISTS "Admins can manage all credits" ON student_credits;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON student_credits;

-- Create new policies
-- 1. SELECT: Users can view their own credits
CREATE POLICY "Users can view their own credits" ON student_credits
    FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

-- 2. SELECT: Staff and Admins can view all credits in their tenant
CREATE POLICY "Staff and Admins can view credits" ON student_credits
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM users 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('staff', 'admin', 'tenant_admin')
        )
    );

-- 3. UPDATE: Users can update their own credits
CREATE POLICY "Users can update their own credits" ON student_credits
    FOR UPDATE
    USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

-- 4. UPDATE: Staff and Admins can update all credits in their tenant
CREATE POLICY "Staff and Admins can update credits" ON student_credits
    FOR UPDATE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM users 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('staff', 'admin', 'tenant_admin')
        )
    )
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM users 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('staff', 'admin', 'tenant_admin')
        )
    );

-- 5. INSERT: Staff and Admins can create credits
CREATE POLICY "Staff and Admins can create credits" ON student_credits
    FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM users 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('staff', 'admin', 'tenant_admin')
        )
    );

-- Verify policies
SELECT 
    schemaname, 
    tablename, 
    policyname,
    permissive,
    roles,
    cmd,
    LEFT(qual, 100) as qual_preview,
    LEFT(with_check, 100) as with_check_preview
FROM pg_policies 
WHERE tablename = 'student_credits'
ORDER BY cmd, policyname;

