-- Fix cash_balances schema compatibility for staff trigger
-- The trigger expects different column names than what exists

-- 1. Check current cash_balances schema
DO $$
BEGIN
    RAISE NOTICE '=== CURRENT CASH_BALANCES SCHEMA ===';
    
    -- Check if columns exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cash_balances' AND column_name = 'instructor_id') THEN
        RAISE NOTICE '✅ instructor_id column exists';
    ELSE
        RAISE NOTICE '❌ instructor_id column missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cash_balances' AND column_name = 'user_id') THEN
        RAISE NOTICE '✅ user_id column exists';
    ELSE
        RAISE NOTICE '❌ user_id column missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cash_balances' AND column_name = 'cash_register_id') THEN
        RAISE NOTICE '✅ cash_register_id column exists';
    ELSE
        RAISE NOTICE '❌ cash_register_id column missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cash_balances' AND column_name = 'office_cash_register_id') THEN
        RAISE NOTICE '✅ office_cash_register_id column exists';
    ELSE
        RAISE NOTICE '❌ office_cash_register_id column missing';
    END IF;
END $$;

-- 2. Add missing columns to cash_balances to make it compatible
-- Add user_id column (alias for instructor_id)
ALTER TABLE cash_balances 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Add cash_register_id column (for personal staff registers)
ALTER TABLE cash_balances 
ADD COLUMN IF NOT EXISTS cash_register_id UUID REFERENCES cash_registers(id);

-- 3. Update user_id to match instructor_id for existing records
UPDATE cash_balances 
SET user_id = instructor_id 
WHERE user_id IS NULL AND instructor_id IS NOT NULL;

-- 4. Add missing columns to cash_movements for compatibility
ALTER TABLE cash_movements 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

ALTER TABLE cash_movements 
ADD COLUMN IF NOT EXISTS cash_register_id UUID REFERENCES cash_registers(id);

-- Update user_id to match instructor_id for existing records
UPDATE cash_movements 
SET user_id = instructor_id 
WHERE user_id IS NULL AND instructor_id IS NOT NULL;

-- 5. Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_cash_balances_user_id ON cash_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_balances_cash_register_id ON cash_balances(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_user_id ON cash_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_cash_register_id ON cash_movements(cash_register_id);

-- 6. Verify the schema is now compatible
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== SCHEMA COMPATIBILITY CHECK ===';
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cash_balances' AND column_name = 'user_id') AND
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cash_balances' AND column_name = 'cash_register_id') THEN
        RAISE NOTICE '✅ cash_balances is now compatible with staff trigger';
    ELSE
        RAISE NOTICE '❌ cash_balances compatibility issue remains';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cash_movements' AND column_name = 'user_id') AND
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cash_movements' AND column_name = 'cash_register_id') THEN
        RAISE NOTICE '✅ cash_movements is now compatible with staff trigger';
    ELSE
        RAISE NOTICE '❌ cash_movements compatibility issue remains';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== SUMMARY ===';
    RAISE NOTICE 'cash_balances now supports both:';
    RAISE NOTICE '- instructor_id (legacy)';
    RAISE NOTICE '- user_id (staff trigger)';
    RAISE NOTICE '- office_cash_register_id (office registers)';
    RAISE NOTICE '- cash_register_id (personal registers)';
END $$;
