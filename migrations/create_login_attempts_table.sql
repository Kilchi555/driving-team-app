-- Migration: Create login_attempts table for security logging
-- Description: Track all login attempts (successful and failed) for security monitoring

CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User info
  email VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Login method
  method VARCHAR(50) DEFAULT 'password' CHECK (method IN ('password', 'webauthn', 'mfa')),
  
  -- Status
  success BOOLEAN NOT NULL,
  error_message TEXT,
  
  -- Network info
  ip_address VARCHAR(50),
  user_agent TEXT,
  
  -- Timestamp
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Multi-tenancy (optional)
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_address ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_success ON login_attempts(success);
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON login_attempts(attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_attempted ON login_attempts(email, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_attempted ON login_attempts(ip_address, attempted_at DESC);

-- Enable RLS
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can view login attempts for their tenant
CREATE POLICY "Admins can view login attempts for their tenant"
  ON login_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
      AND (
        u.role IN ('admin', 'tenant_admin')
        OR u.role = 'master_admin'
      )
      AND (
        u.role = 'master_admin'
        OR u.tenant_id = login_attempts.tenant_id
      )
    )
  );

-- Service role can bypass RLS
CREATE POLICY "Service role can bypass login_attempts RLS"
  ON login_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users and anon to insert (for logging purposes)
CREATE POLICY "Allow insert for authenticated and anon users"
  ON login_attempts
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);





