-- Migration: Ensure webhook_logs table exists and RLS is properly configured
-- The webhook_logs table may have been created in sql_migrations/ but never applied.
-- This migration is idempotent (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id VARCHAR(50) NOT NULL,
  entity_id BIGINT,
  space_id INTEGER,
  wallee_state VARCHAR(50),
  listener_entity_id INTEGER,
  listener_entity_technical_name VARCHAR(255),
  timestamp TIMESTAMP WITH TIME ZONE,
  payment_id UUID,
  payment_status_before VARCHAR(50),
  payment_status_after VARCHAR(50),
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  processing_duration_ms INTEGER,
  raw_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_transaction_id ON webhook_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_payment_id ON webhook_logs(payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'webhook_logs' AND policyname = 'Allow super_admin read all webhook logs'
  ) THEN
    CREATE POLICY "Allow super_admin read all webhook logs" ON webhook_logs
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.auth_user_id = auth.uid()
          AND u.role = 'super_admin'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'webhook_logs' AND policyname = 'Allow service role manage webhook logs'
  ) THEN
    CREATE POLICY "Allow service role manage webhook logs" ON webhook_logs
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

GRANT ALL ON webhook_logs TO authenticated;
GRANT SELECT ON webhook_logs TO anon;

SELECT '✅ webhook_logs table verified/created!' as status;
