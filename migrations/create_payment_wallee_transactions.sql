-- Migration: Create payment_wallee_transactions history table
-- Purpose: Track ALL Wallee transaction IDs ever created for a payment.
--          When a user clicks "pay" multiple times, a new Wallee transaction is created
--          each time and the wallee_transaction_id on the payments table is overwritten.
--          This causes webhooks for older (but completed) transactions to fail the lookup.
--          This history table enables the webhook handler to find the payment even when
--          the transaction ID has been overwritten.

CREATE TABLE IF NOT EXISTS payment_wallee_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL,
  wallee_transaction_id VARCHAR(50) NOT NULL,
  wallee_space_id INTEGER,
  merchant_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pwt_payment_id
  ON payment_wallee_transactions(payment_id);

CREATE INDEX IF NOT EXISTS idx_pwt_wallee_transaction_id
  ON payment_wallee_transactions(wallee_transaction_id);

CREATE INDEX IF NOT EXISTS idx_pwt_created_at
  ON payment_wallee_transactions(created_at DESC);

ALTER TABLE payment_wallee_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_read_payment_wallee_transactions" ON payment_wallee_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

CREATE POLICY "service_role_manage_payment_wallee_transactions" ON payment_wallee_transactions
  FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT ALL ON payment_wallee_transactions TO authenticated;
GRANT SELECT ON payment_wallee_transactions TO anon;

COMMENT ON TABLE payment_wallee_transactions IS 'History of all Wallee transaction IDs created for each payment - enables webhook matching when transaction IDs are overwritten';
COMMENT ON COLUMN payment_wallee_transactions.payment_id IS 'Reference to the payment this transaction belongs to';
COMMENT ON COLUMN payment_wallee_transactions.wallee_transaction_id IS 'The Wallee transaction ID (entityId)';
COMMENT ON COLUMN payment_wallee_transactions.merchant_reference IS 'The merchantReference used when creating this transaction';

SELECT '✅ payment_wallee_transactions table created successfully!' as status;
