-- Migration: Create webhook_logs table for Wallee webhook debugging
-- Purpose: Track all incoming webhooks, their processing, and any errors
-- Created: 2026-02-04

-- Create webhook_logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Webhook payload info
  transaction_id VARCHAR(50) NOT NULL,
  entity_id BIGINT,
  space_id INTEGER,
  wallee_state VARCHAR(50),
  listener_entity_id INTEGER,
  listener_entity_technical_name VARCHAR(255),
  timestamp TIMESTAMP WITH TIME ZONE,
  
  -- Our processing
  payment_id UUID,
  payment_status_before VARCHAR(50),
  payment_status_after VARCHAR(50),
  
  -- Result
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  processing_duration_ms INTEGER,
  
  -- Raw payload for debugging
  raw_payload JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_webhook_logs_transaction_id ON webhook_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_payment_id ON webhook_logs(payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_success ON webhook_logs(success);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_wallee_state ON webhook_logs(wallee_state);

-- Enable RLS
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Allow super_admin to read all logs
CREATE POLICY "Allow super_admin read all webhook logs" ON webhook_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

-- Allow service role to insert/update
CREATE POLICY "Allow service role manage webhook logs" ON webhook_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT ALL ON webhook_logs TO authenticated;
GRANT SELECT ON webhook_logs TO anon;

-- Comment
COMMENT ON TABLE webhook_logs IS 'Logs for all Wallee webhook events - used for debugging payment processing issues';
COMMENT ON COLUMN webhook_logs.transaction_id IS 'Wallee transaction ID from entityId';
COMMENT ON COLUMN webhook_logs.wallee_state IS 'Wallee state from webhook (PENDING, FULFILL, FAILED, CANCELED, etc)';
COMMENT ON COLUMN webhook_logs.success IS 'Whether webhook was processed successfully';
COMMENT ON COLUMN webhook_logs.raw_payload IS 'Full webhook payload for debugging';

SELECT '✅ webhook_logs table created successfully!' as status;
