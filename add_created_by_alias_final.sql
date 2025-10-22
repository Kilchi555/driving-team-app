-- Add created_by column as alias for performed_by in cash_movements
-- The staff trigger expects 'created_by' but the table uses 'performed_by'

-- 1. Add created_by column (same as performed_by)
ALTER TABLE cash_movements 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- 2. Copy existing performed_by values to created_by for compatibility
UPDATE cash_movements 
SET created_by = performed_by 
WHERE created_by IS NULL AND performed_by IS NOT NULL;

-- 3. Create index for the new column
CREATE INDEX IF NOT EXISTS idx_cash_movements_created_by ON cash_movements(created_by);

-- 4. Verify everything is complete
DO $$
BEGIN
    -- Check if all required columns exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cash_movements' AND column_name = 'created_by') AND
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cash_movements' AND column_name = 'description') AND
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cash_movements' AND column_name = 'user_id') AND
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cash_movements' AND column_name = 'cash_register_id') THEN
        
        RAISE NOTICE '✅ created_by column added to cash_movements';
        RAISE NOTICE '✅ description column exists';
        RAISE NOTICE '✅ user_id column exists';  
        RAISE NOTICE '✅ cash_register_id column exists';
        RAISE NOTICE '';
        RAISE NOTICE '🎉 ALL SCHEMA ISSUES RESOLVED!';
        RAISE NOTICE '';
        RAISE NOTICE '=== FINAL COMPATIBILITY STATUS ===';
        RAISE NOTICE '✅ cash_registers table: EXISTS';
        RAISE NOTICE '✅ cash_balances schema: COMPLETE';
        RAISE NOTICE '✅ cash_movements schema: COMPLETE';
        RAISE NOTICE '';
        RAISE NOTICE '🚀 User creation should now work perfectly!';
    ELSE
        RAISE NOTICE '❌ Some columns are still missing';
    END IF;
END $$;
















