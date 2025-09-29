-- Add missing last_transaction_at column to cash_balances
-- This is needed by the staff trigger

-- 1. Add the missing column
ALTER TABLE cash_balances 
ADD COLUMN IF NOT EXISTS last_transaction_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Update existing records to have a reasonable default
UPDATE cash_balances 
SET last_transaction_at = COALESCE(updated_at, created_at, NOW())
WHERE last_transaction_at IS NULL;

-- 3. Add index for performance
CREATE INDEX IF NOT EXISTS idx_cash_balances_last_transaction_at ON cash_balances(last_transaction_at);

-- 4. Verify the column was added
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cash_balances' AND column_name = 'last_transaction_at') THEN
        RAISE NOTICE '✅ last_transaction_at column added successfully';
        RAISE NOTICE '✅ cash_balances schema is now complete for staff trigger';
    ELSE
        RAISE NOTICE '❌ last_transaction_at column addition failed';
    END IF;
END $$;
