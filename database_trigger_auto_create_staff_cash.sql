-- ========================================
-- AUTOMATIC STAFF CASH REGISTER CREATION
-- ========================================
-- This trigger automatically creates a personal cash register 
-- when a user's role is set to 'staff'

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS trigger_create_staff_cash ON users;
DROP FUNCTION IF EXISTS create_staff_cash_register();

-- Function to create staff cash register
CREATE OR REPLACE FUNCTION create_staff_cash_register()
RETURNS TRIGGER AS $$
DECLARE
    staff_name TEXT;
    register_name TEXT;
    new_register_id UUID;
    existing_balance_id UUID;
BEGIN
    -- Only proceed if the role is being set to 'staff'
    IF NEW.role = 'staff' AND (OLD IS NULL OR OLD.role != 'staff') THEN
        
        -- Generate staff name for register
        staff_name := COALESCE(NEW.first_name || ' ' || NEW.last_name, NEW.email, 'Unbekannter Staff');
        register_name := staff_name || ' - Persönliche Kasse';
        
        -- Create the cash register
        INSERT INTO cash_registers (
            id,
            tenant_id,
            name,
            description,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            NEW.tenant_id,
            register_name,
            'Automatisch erstellte persönliche Kasse für ' || staff_name,
            true,
            NOW(),
            NOW()
        ) RETURNING id INTO new_register_id;
        
        -- Check if staff already has a cash balance entry
        SELECT id INTO existing_balance_id 
        FROM cash_balances 
        WHERE user_id = NEW.id AND tenant_id = NEW.tenant_id;
        
        -- Create or update cash balance
        IF existing_balance_id IS NULL THEN
            -- Create new balance entry
            INSERT INTO cash_balances (
                id,
                user_id,
                tenant_id,
                cash_register_id,
                current_balance_rappen,
                last_transaction_at,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                NEW.id,
                NEW.tenant_id,
                new_register_id,
                0, -- Start with 0 balance
                NOW(),
                NOW(),
                NOW()
            );
        ELSE
            -- Update existing balance to link to new register
            UPDATE cash_balances 
            SET 
                cash_register_id = new_register_id,
                updated_at = NOW()
            WHERE id = existing_balance_id;
        END IF;
        
        -- Log the automatic creation
        INSERT INTO cash_movements (
            id,
            user_id,
            tenant_id,
            cash_register_id,
            movement_type,
            amount_rappen,
            description,
            created_by,
            created_at
        ) VALUES (
            gen_random_uuid(),
            NEW.id,
            NEW.tenant_id,
            new_register_id,
            'system_init',
            0,
            'Automatische Kassen-Erstellung für neuen Staff: ' || staff_name,
            NEW.id,
            NOW()
        );
        
        -- Log success
        RAISE NOTICE 'Staff cash register created for user % (%) with register ID %', 
                     staff_name, NEW.id, new_register_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER trigger_create_staff_cash
    AFTER INSERT OR UPDATE OF role ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_staff_cash_register();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_staff_cash_register() TO authenticated;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Check if trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_create_staff_cash';

-- Check existing staff without cash registers
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    u.tenant_id,
    cr.id as register_id,
    cr.name as register_name,
    cb.current_balance_rappen
FROM users u
LEFT JOIN cash_balances cb ON cb.user_id = u.id
LEFT JOIN cash_registers cr ON cr.id = cb.cash_register_id
WHERE u.role = 'staff' 
  AND u.is_active = true 
  AND u.deleted_at IS NULL
ORDER BY u.tenant_id, u.last_name;

-- ========================================
-- MANUAL TRIGGER FOR EXISTING STAFF
-- ========================================

-- Create registers for existing staff members who don't have one
DO $$
DECLARE
    staff_record RECORD;
    staff_name TEXT;
    register_name TEXT;
    new_register_id UUID;
    existing_balance_id UUID;
BEGIN
    -- Loop through existing staff without cash registers
    FOR staff_record IN 
        SELECT DISTINCT u.*
        FROM users u
        LEFT JOIN cash_balances cb ON cb.user_id = u.id
        WHERE u.role = 'staff' 
          AND u.is_active = true 
          AND u.deleted_at IS NULL
          AND cb.id IS NULL
    LOOP
        -- Generate staff name for register
        staff_name := COALESCE(staff_record.first_name || ' ' || staff_record.last_name, 
                              staff_record.email, 'Unbekannter Staff');
        register_name := staff_name || ' - Persönliche Kasse';
        
        -- Create the cash register
        INSERT INTO cash_registers (
            id,
            tenant_id,
            name,
            description,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            staff_record.tenant_id,
            register_name,
            'Nachträglich erstellte persönliche Kasse für ' || staff_name,
            true,
            NOW(),
            NOW()
        ) RETURNING id INTO new_register_id;
        
        -- Create cash balance
        INSERT INTO cash_balances (
            id,
            user_id,
            tenant_id,
            cash_register_id,
            current_balance_rappen,
            last_transaction_at,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            staff_record.id,
            staff_record.tenant_id,
            new_register_id,
            0,
            NOW(),
            NOW(),
            NOW()
        );
        
        -- Log the creation
        INSERT INTO cash_movements (
            id,
            user_id,
            tenant_id,
            cash_register_id,
            movement_type,
            amount_rappen,
            description,
            created_by,
            created_at
        ) VALUES (
            gen_random_uuid(),
            staff_record.id,
            staff_record.tenant_id,
            new_register_id,
            'system_init',
            0,
            'Nachträgliche Kassen-Erstellung für bestehenden Staff: ' || staff_name,
            staff_record.id,
            NOW()
        );
        
        RAISE NOTICE 'Created cash register for existing staff: % (%)', 
                     staff_name, staff_record.id;
    END LOOP;
END $$;




