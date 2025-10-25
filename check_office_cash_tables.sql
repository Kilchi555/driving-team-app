-- Check if office cash tables exist and have data

-- 1. Check if tables exist
SELECT 
    'office_cash_registers' as table_name,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'office_cash_registers'
    ) as table_exists;

SELECT 
    'office_cash_staff_assignments' as table_name,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'office_cash_staff_assignments'
    ) as table_exists;

-- 2. Check if view exists
SELECT 
    'office_cash_overview' as view_name,
    EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_name = 'office_cash_overview'
    ) as view_exists;

-- 3. If tables exist, check data
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'office_cash_registers') THEN
        RAISE NOTICE '';
        RAISE NOTICE '=== OFFICE CASH REGISTERS TABLE DATA ===';
        
        -- Show all office cash registers
        RAISE NOTICE 'Total office cash registers: %', (
            SELECT COUNT(*) FROM office_cash_registers
        );
        
        -- Show by tenant
        PERFORM 
            t.name as tenant_name,
            COUNT(ocr.id) as register_count
        FROM tenants t
        LEFT JOIN office_cash_registers ocr ON t.id = ocr.tenant_id
        WHERE t.is_active = TRUE
        GROUP BY t.id, t.name
        ORDER BY t.name;
        
        -- Show detailed info
        RAISE NOTICE '';
        RAISE NOTICE 'Detailed office cash registers:';
        PERFORM 
            ocr.id,
            ocr.name,
            ocr.register_type,
            ocr.is_main_register,
            t.name as tenant_name
        FROM office_cash_registers ocr
        JOIN tenants t ON ocr.tenant_id = t.id
        WHERE ocr.is_active = TRUE
        ORDER BY t.name, ocr.is_main_register DESC, ocr.name;
        
    ELSE
        RAISE NOTICE '❌ office_cash_registers table does not exist!';
        RAISE NOTICE 'Run database_migration_multi_office_cash.sql first.';
    END IF;
END $$;

-- 4. Check current user's tenant and permissions
DO $$
DECLARE
    current_user_email TEXT;
    current_tenant_id UUID;
    current_role TEXT;
BEGIN
    -- This would normally come from the JWT, but we can check the users table
    RAISE NOTICE '';
    RAISE NOTICE '=== USER TENANT ANALYSIS ===';
    
    -- Show all active admin users and their tenants
    RAISE NOTICE 'Active admin users:';
    PERFORM 
        u.email,
        u.role,
        u.tenant_id,
        t.name as tenant_name
    FROM users u
    JOIN tenants t ON u.tenant_id = t.id
    WHERE u.role IN ('admin', 'tenant_admin')
      AND u.is_active = TRUE
      AND u.deleted_at IS NULL
    ORDER BY t.name, u.email;
    
END $$;

-- 5. Quick fix: If no office cash registers exist, create them
DO $$
DECLARE
    tenant_record RECORD;
    admin_user_id UUID;
    register_count INTEGER;
BEGIN
    -- Check if we need to create office cash registers
    SELECT COUNT(*) INTO register_count FROM office_cash_registers;
    
    IF register_count = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '=== CREATING MISSING OFFICE CASH REGISTERS ===';
        
        FOR tenant_record IN 
            SELECT id, name FROM tenants WHERE is_active = TRUE
        LOOP
            -- Find admin for this tenant
            SELECT id INTO admin_user_id
            FROM users 
            WHERE tenant_id = tenant_record.id 
              AND role IN ('admin', 'tenant_admin')
              AND is_active = TRUE
              AND deleted_at IS NULL
            ORDER BY created_at ASC 
            LIMIT 1;
            
            IF admin_user_id IS NOT NULL THEN
                -- Create main office register
                INSERT INTO office_cash_registers (
                    tenant_id,
                    name,
                    description,
                    location,
                    register_type,
                    is_main_register,
                    created_by
                ) VALUES (
                    tenant_record.id,
                    'Hauptkasse',
                    'Zentrale Bürokasse für ' || tenant_record.name,
                    'Büro',
                    'office',
                    TRUE,
                    admin_user_id
                );
                
                RAISE NOTICE 'Created main office register for: %', tenant_record.name;
            ELSE
                RAISE NOTICE 'No admin found for tenant: %', tenant_record.name;
            END IF;
        END LOOP;
    ELSE
        RAISE NOTICE 'Office cash registers already exist: %', register_count;
    END IF;
END $$;



















