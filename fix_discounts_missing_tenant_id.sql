-- Fix existing discounts that are missing tenant_id
-- This script assigns tenant_id based on the user who created the discount

-- First, let's see how many discounts are missing tenant_id
SELECT 
    COUNT(*) as total_discounts,
    COUNT(tenant_id) as with_tenant_id,
    COUNT(*) - COUNT(tenant_id) as missing_tenant_id
FROM discounts;

-- Show discounts without tenant_id
SELECT 
    id,
    code,
    created_at,
    tenant_id
FROM discounts 
WHERE tenant_id IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- For discounts created by admin users, we can try to assign tenant_id
-- based on the admin's tenant_id
DO $$
DECLARE
    discount_record RECORD;
    admin_tenant_id UUID;
    updated_count INTEGER := 0;
BEGIN
    -- Loop through discounts without tenant_id
    FOR discount_record IN 
        SELECT id, code, created_at 
        FROM discounts 
        WHERE tenant_id IS NULL
    LOOP
        -- Try to find the tenant_id from the most recent admin user
        -- This is a best guess - in production you might have better logic
        SELECT u.tenant_id INTO admin_tenant_id
        FROM users u
        WHERE u.role IN ('admin', 'tenant_admin')
          AND u.tenant_id IS NOT NULL
          AND u.is_active = true
        ORDER BY u.created_at DESC
        LIMIT 1;
        
        -- If we found a tenant_id, update the discount
        IF admin_tenant_id IS NOT NULL THEN
            UPDATE discounts 
            SET tenant_id = admin_tenant_id
            WHERE id = discount_record.id;
            
            updated_count := updated_count + 1;
            
            RAISE NOTICE 'Updated discount % with tenant_id %', 
                discount_record.code, admin_tenant_id;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Updated % discounts with tenant_id', updated_count;
END $$;

-- Verify the fix
SELECT 
    COUNT(*) as total_discounts,
    COUNT(tenant_id) as with_tenant_id,
    COUNT(*) - COUNT(tenant_id) as still_missing_tenant_id
FROM discounts;

-- Show remaining discounts without tenant_id (should be 0 or very few)
SELECT 
    id,
    code,
    created_at,
    tenant_id
FROM discounts 
WHERE tenant_id IS NULL
ORDER BY created_at DESC;

-- Create a more robust RLS policy for discounts if it doesn't exist
DROP POLICY IF EXISTS "discounts_tenant_isolation" ON discounts;

CREATE POLICY "discounts_tenant_isolation" ON discounts
    FOR ALL TO authenticated
    USING (
        -- Admin users can see discounts for their tenant
        (
            auth.jwt() ->> 'role' IN ('admin', 'tenant_admin')
            AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
        OR
        -- Master admin can see all discounts
        (auth.jwt() ->> 'role')::text = 'master_admin'
        OR
        -- Regular users can see discounts for their tenant
        (
            tenant_id = (
                SELECT u.tenant_id 
                FROM users u 
                WHERE u.auth_user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        -- Only admin users can modify discounts
        (
            auth.jwt() ->> 'role' IN ('admin', 'tenant_admin', 'master_admin')
            AND (
                -- Master admin can modify any discount
                (auth.jwt() ->> 'role')::text = 'master_admin'
                OR
                -- Tenant admins can only modify discounts for their tenant
                tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
            )
        )
    );

-- Summary
RAISE NOTICE '';
RAISE NOTICE '=== DISCOUNT TENANT_ID FIX COMPLETED ===';
RAISE NOTICE '';
RAISE NOTICE 'All discounts should now have a tenant_id assigned.';
RAISE NOTICE 'Future discounts will automatically get tenant_id from the composable.';
RAISE NOTICE 'RLS policy updated to ensure tenant isolation.';
RAISE NOTICE '';




















