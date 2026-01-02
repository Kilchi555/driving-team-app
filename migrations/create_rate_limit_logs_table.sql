-- Migration: Create rate_limit_logs table for tracking login and other attempts
-- Description: Store rate limit events for security monitoring and analytics
-- Benefits: Can be displayed in admin dashboard and analyzed for suspicious activity

CREATE TABLE IF NOT EXISTS rate_limit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Operation type
  operation VARCHAR(50) NOT NULL CHECK (operation IN ('login', 'register', 'password_reset')),
  
  -- IP Address
  ip_address VARCHAR(50) NOT NULL,
  
  -- Request details
  email VARCHAR(255),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Status
  status VARCHAR(50) NOT NULL CHECK (status IN ('allowed', 'blocked', 'exceeded')),
  
  -- Rate limit state
  request_count INTEGER,
  max_requests INTEGER,
  window_seconds INTEGER,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Multi-tenancy
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_ip_address ON rate_limit_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_operation ON rate_limit_logs(operation);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_email ON rate_limit_logs(email);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_status ON rate_limit_logs(status);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_created_at ON rate_limit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_tenant_id ON rate_limit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_ip_operation ON rate_limit_logs(ip_address, operation, created_at);

-- Enable RLS
ALTER TABLE rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins can view rate limit logs for their tenant
CREATE POLICY "Admins can view rate limit logs for their tenant"
  ON rate_limit_logs FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid() AND role IN ('admin', 'tenant_admin')
    )
  );

CREATE POLICY "Service role can insert rate limit logs"
  ON rate_limit_logs FOR INSERT
  WITH CHECK (true);

-- Add comment explaining the table
COMMENT ON TABLE rate_limit_logs IS 'Stores rate limit events for security monitoring and admin dashboard analytics';
COMMENT ON COLUMN rate_limit_logs.operation IS 'Type of operation: login, register, or password_reset';
COMMENT ON COLUMN rate_limit_logs.status IS 'allowed: within limit, blocked: rate limit exceeded, exceeded: triggered action';

