-- Fix the staff trigger to use existing office_cash_registers instead of non-existent cash_registers
-- This fixes the "relation cash_registers does not exist" error

-- Drop the problematic trigger and function
DROP TRIGGER IF EXISTS trigger_create_staff_cash ON users;
DROP FUNCTION IF EXISTS create_staff_cash_register();

-- Create corrected function that uses existing tables
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
        
        -- Create the cash register using EXISTING office_cash_registers table
        INSERT INTO office_cash_registers (
            id,
            tenant_id,
            name,
            description,
            location,
            register_type,
            is_main_register,
            is_active,
            created_by,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            NEW.tenant_id,
            register_name,
            'Automatisch erstellte persönliche Kasse für ' || staff_name,
            'Personal',
            'staff',
            false,
            true,
            NEW.id,
            NOW(),
            NOW()
        ) RETURNING id INTO new_register_id;
        
        -- Check if staff already has a cash balance entry
        SELECT id INTO existing_balance_id 
        FROM cash_balances 
        WHERE user_id = NEW.id AND tenant_id = NEW.tenant_id;
        
        -- Create or update cash balance using existing structure
        IF existing_balance_id IS NULL THEN
            -- Create new balance entry
            INSERT INTO cash_balances (
                id,
                user_id,
                tenant_id,
                office_cash_register_id,
                register_type,
                current_balance_rappen,
                last_transaction_at,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                NEW.id,
                NEW.tenant_id,
                new_register_id,
                'office',
                0, -- Start with 0 balance
                NOW(),
                NOW(),
                NOW()
            );
        ELSE
            -- Update existing balance to link to new register
            UPDATE cash_balances 
            SET 
                office_cash_register_id = new_register_id,
                register_type = 'office',
                updated_at = NOW()
            WHERE id = existing_balance_id;
        END IF;
        
        -- Log the automatic creation using existing structure
        INSERT INTO cash_movements (
            id,
            user_id,
            tenant_id,
            office_cash_register_id,
            register_type,
            movement_type,
            amount_rappen,
            balance_before_rappen,
            balance_after_rappen,
            description,
            performed_by,
            created_at
        ) VALUES (
            gen_random_uuid(),
            NEW.id,
            NEW.tenant_id,
            new_register_id,
            'office',
            'system_init',
            0,
            0,
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

-- Create corrected trigger
CREATE TRIGGER trigger_create_staff_cash
    AFTER INSERT OR UPDATE OF role ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_staff_cash_register();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_staff_cash_register() TO authenticated;

-- Verify the fix
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'trigger_create_staff_cash'
    ) THEN
        RAISE NOTICE '✅ Staff trigger fixed successfully';
        RAISE NOTICE '✅ Now uses existing office_cash_registers table';
        RAISE NOTICE '✅ Compatible with existing database structure';
    ELSE
        RAISE NOTICE '❌ Trigger creation failed!';
    END IF;
END $$;


















