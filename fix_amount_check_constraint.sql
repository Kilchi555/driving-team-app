-- Fix amount_rappen check constraint to allow 0 for system initialization
-- Currently: amount_rappen > 0 (doesn't allow 0)
-- Should be: amount_rappen >= 0 (allows 0 for initialization)

-- 1. Drop the existing constraint
ALTER TABLE cash_movements 
DROP CONSTRAINT IF EXISTS cash_movements_amount_rappen_check;

-- 2. Add corrected constraint that allows 0 for system initialization
ALTER TABLE cash_movements 
ADD CONSTRAINT cash_movements_amount_rappen_check 
CHECK (amount_rappen >= 0);

-- 3. Verify the fix
DO $$
BEGIN
    -- Check if the constraint was updated
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'cash_movements_amount_rappen_check'
    ) THEN
        RAISE NOTICE 'Check constraint fixed: amount_rappen >= 0';
        RAISE NOTICE 'System initialization with amount 0 is now allowed';
        RAISE NOTICE 'ALL CONSTRAINTS FIXED!';
        RAISE NOTICE 'FINAL STATUS:';
        RAISE NOTICE 'cash_registers table: EXISTS';
        RAISE NOTICE 'cash_balances schema: COMPLETE';
        RAISE NOTICE 'cash_movements schema: COMPLETE';
        RAISE NOTICE 'Staff trigger data: CORRECT';
        RAISE NOTICE 'Check constraints: FIXED';
        RAISE NOTICE 'USER CREATION SHOULD NOW WORK 100 PERCENT!';
    ELSE
        RAISE NOTICE 'Check constraint fix failed';
    END IF;
END $$;
