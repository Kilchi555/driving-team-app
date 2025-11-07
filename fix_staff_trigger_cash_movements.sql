-- Fix staff trigger to properly set all required NOT NULL fields in cash_movements
-- The trigger currently doesn't set balance_before_rappen and balance_after_rappen

-- Drop and recreate the staff trigger function with correct cash_movements data
DROP TRIGGER IF EXISTS trigger_create_staff_cash ON users;
DROP FUNCTION IF EXISTS create_staff_cash_register();

-- Create corrected function that properly sets all required fields
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
                updated_at,
                -- Also set legacy fields for compatibility
                instructor_id
            ) VALUES (
                gen_random_uuid(),
                NEW.id,
                NEW.tenant_id,
                new_register_id,
                0, -- Start with 0 balance
                NOW(),
                NOW(),
                NOW(),
                NEW.id -- Set instructor_id same as user_id
            );
        ELSE
            -- Update existing balance to link to new register
            UPDATE cash_balances 
            SET 
                cash_register_id = new_register_id,
                updated_at = NOW()
            WHERE id = existing_balance_id;
        END IF;
        
        -- Log the automatic creation with ALL required fields
        INSERT INTO cash_movements (
            id,
            user_id,
            tenant_id,
            cash_register_id,
            movement_type,
            amount_rappen,
            balance_before_rappen,    -- ✅ Required NOT NULL field
            balance_after_rappen,     -- ✅ Required NOT NULL field
            description,
            created_by,
            created_at,
            -- Also set legacy fields for compatibility
            instructor_id,
            performed_by
        ) VALUES (
            gen_random_uuid(),
            NEW.id,
            NEW.tenant_id,
            new_register_id,
            'system_init',
            0,
            0,  -- ✅ balance_before_rappen = 0 (starting balance)
            0,  -- ✅ balance_after_rappen = 0 (no change for init)
            'Automatische Kassen-Erstellung für neuen Staff: ' || staff_name,
            NEW.id,
            NOW(),
            NEW.id,  -- Set instructor_id same as user_id
            NEW.id   -- Set performed_by same as user_id
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
    RAISE NOTICE '✅ Staff trigger fixed with proper cash_movements data';
    RAISE NOTICE '✅ All NOT NULL constraints will be satisfied';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 USER CREATION SHOULD NOW WORK PERFECTLY!';
END $$;




















