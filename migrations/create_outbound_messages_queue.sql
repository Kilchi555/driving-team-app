-- Create outbound_messages_queue table for general purpose message queuing
CREATE TABLE IF NOT EXISTS outbound_messages_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Message details
  channel VARCHAR(50) NOT NULL, -- 'email', 'sms', 'push'
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(50),
  subject TEXT,
  body TEXT NOT NULL, -- Rendered message body
  
  -- Scheduling and Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'sending', 'sent', 'failed', 'retrying'
  send_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), -- When to attempt sending
  sent_at TIMESTAMP WITH TIME ZONE, -- Actual send timestamp
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  error_code VARCHAR(100),
  attempt_count INTEGER DEFAULT 0, -- Number of sending attempts
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  next_attempt_at TIMESTAMP WITH TIME ZONE,
  
  -- External IDs
  resend_message_id VARCHAR(255), -- For emails sent via Resend
  
  -- Contextual data (for logging/debugging)
  context_data JSONB DEFAULT '{}'::jsonb, -- e.g., { payment_id: '...', appointment_id: '...' }
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying of pending messages
CREATE INDEX IF NOT EXISTS idx_outbound_messages_queue_status_send_at
ON outbound_messages_queue (status, send_at);

CREATE INDEX IF NOT EXISTS idx_outbound_messages_queue_tenant_id
ON outbound_messages_queue (tenant_id);

-- Enable RLS
ALTER TABLE outbound_messages_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Service role can manage all messages (for cron jobs)
CREATE POLICY "service_role_manage_outbound_messages"
  ON outbound_messages_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Authenticated users can view their own tenant's messages (for admin/staff dashboards)
CREATE POLICY "authenticated_view_tenant_outbound_messages"
  ON outbound_messages_queue
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );
