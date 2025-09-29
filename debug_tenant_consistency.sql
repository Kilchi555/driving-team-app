-- Debug Tenant Consistency Issues
-- This script helps identify potential causes of unwanted tenant switching

-- 1. Check for users with multiple tenant assignments (should not exist)
SELECT 
    email,
    COUNT(*) as user_count,
    array_agg(DISTINCT tenant_id) as tenant_ids,
    array_agg(DISTINCT role) as roles
FROM users 
WHERE is_active = true 
  AND deleted_at IS NULL
GROUP BY email 
HAVING COUNT(*) > 1
ORDER BY user_count DESC;

-- 2. Check for users without tenant_id (problematic)
SELECT 
    id,
    email,
    role,
    tenant_id,
    created_at
FROM users 
WHERE tenant_id IS NULL 
  AND is_active = true 
  AND deleted_at IS NULL
ORDER BY created_at DESC;

-- 3. Check for admins and their tenant assignments
SELECT 
    u.email,
    u.role,
    u.admin_level,
    u.is_primary_admin,
    u.tenant_id,
    t.name as tenant_name,
    t.slug as tenant_slug
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.role IN ('admin', 'master_admin')
  AND u.is_active = true 
  AND u.deleted_at IS NULL
ORDER BY u.tenant_id, u.is_primary_admin DESC, u.created_at;

-- 4. Check for orphaned data without proper tenant_id
SELECT 'discounts' as table_name, COUNT(*) as records_without_tenant
FROM discounts WHERE tenant_id IS NULL
UNION ALL
SELECT 'appointments', COUNT(*) FROM appointments WHERE tenant_id IS NULL
UNION ALL
SELECT 'payments', COUNT(*) FROM payments WHERE tenant_id IS NULL
UNION ALL
SELECT 'categories', COUNT(*) FROM categories WHERE tenant_id IS NULL;

-- 5. Check RLS policies that might cause issues
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('users', 'tenants', 'discounts', 'appointments', 'payments')
ORDER BY tablename, policyname;

-- 6. Check for potential JWT token issues by looking at auth patterns
-- This shows recent auth patterns that might indicate problems
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as user_logins,
    COUNT(DISTINCT tenant_id) as distinct_tenants,
    array_agg(DISTINCT role) as roles_seen
FROM users 
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND is_active = true
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC
LIMIT 24;

-- 7. Summary report
DO $$
DECLARE
    duplicate_emails INTEGER;
    no_tenant_users INTEGER;
    orphaned_discounts INTEGER;
    total_active_users INTEGER;
BEGIN
    -- Count issues
    SELECT COUNT(*) INTO duplicate_emails
    FROM (
        SELECT email 
        FROM users 
        WHERE is_active = true AND deleted_at IS NULL
        GROUP BY email 
        HAVING COUNT(*) > 1
    ) sub;
    
    SELECT COUNT(*) INTO no_tenant_users
    FROM users 
    WHERE tenant_id IS NULL AND is_active = true AND deleted_at IS NULL;
    
    SELECT COUNT(*) INTO orphaned_discounts
    FROM discounts 
    WHERE tenant_id IS NULL;
    
    SELECT COUNT(*) INTO total_active_users
    FROM users 
    WHERE is_active = true AND deleted_at IS NULL;
    
    -- Report
    RAISE NOTICE '';
    RAISE NOTICE '=== TENANT CONSISTENCY REPORT ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Total Active Users: %', total_active_users;
    RAISE NOTICE 'Users with Duplicate Emails: %', duplicate_emails;
    RAISE NOTICE 'Users without Tenant ID: %', no_tenant_users;
    RAISE NOTICE 'Orphaned Discounts: %', orphaned_discounts;
    RAISE NOTICE '';
    
    IF duplicate_emails > 0 THEN
        RAISE NOTICE '🚨 CRITICAL: Duplicate email addresses found!';
        RAISE NOTICE 'This can cause tenant switching issues.';
    END IF;
    
    IF no_tenant_users > 0 THEN
        RAISE NOTICE '⚠️ WARNING: Users without tenant_id found!';
        RAISE NOTICE 'These users may cause authentication issues.';
    END IF;
    
    IF orphaned_discounts > 0 THEN
        RAISE NOTICE '⚠️ WARNING: Discounts without tenant_id found!';
        RAISE NOTICE 'Run fix_discounts_missing_tenant_id.sql to fix this.';
    END IF;
    
    IF duplicate_emails = 0 AND no_tenant_users = 0 THEN
        RAISE NOTICE '✅ No major tenant consistency issues detected.';
    END IF;
    
    RAISE NOTICE '';
END $$;
