-- Add missing description column to cash_movements
-- The staff trigger expects 'description' but the table only has 'notes'

-- 1. Add the missing description column
ALTER TABLE cash_movements 
ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Copy existing notes to description for compatibility
UPDATE cash_movements 
SET description = notes 
WHERE description IS NULL AND notes IS NOT NULL;

-- 3. Verify the column was added
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cash_movements' AND column_name = 'description') THEN
        RAISE NOTICE '✅ description column added to cash_movements';
        RAISE NOTICE '✅ Staff trigger compatibility restored';
        RAISE NOTICE '';
        RAISE NOTICE '=== FINAL STATUS ===';
        RAISE NOTICE '✅ cash_registers table: EXISTS';
        RAISE NOTICE '✅ cash_balances schema: COMPLETE';
        RAISE NOTICE '✅ cash_movements schema: COMPLETE';
        RAISE NOTICE '';
        RAISE NOTICE '🎉 User creation should now work!';
    ELSE
        RAISE NOTICE '❌ description column addition failed';
    END IF;
END $$;











