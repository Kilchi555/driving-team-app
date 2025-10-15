-- Add wallee_transaction_id column to payments table
-- This allows the webhook to find payments by Wallee transaction ID

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS wallee_transaction_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_wallee_transaction_id 
ON payments(wallee_transaction_id);

-- Add comment
COMMENT ON COLUMN payments.wallee_transaction_id IS 'Wallee transaction ID for payment webhook lookup';
