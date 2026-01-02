-- Create error_logs table for tracking application errors
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Error Details
  error_type VARCHAR(100) NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  
  -- Context
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- User Info
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  
  -- Breadcrumbs (JSON array)
  breadcrumbs JSONB DEFAULT '[]',
  
  -- Environment
  environment VARCHAR(50) DEFAULT 'production',
  browser_name VARCHAR(100),
  browser_version VARCHAR(100),
  user_agent TEXT,
  url VARCHAR(500),
  
  -- Performance
  page_load_time INTEGER,
  api_response_time INTEGER,
  
  -- Status
  status VARCHAR(50) DEFAULT 'new', -- new, acknowledged, resolved, ignored
  severity VARCHAR(50) DEFAULT 'error', -- info, warning, error, critical
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_tenant_id ON error_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_status ON error_logs(status);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_environment ON error_logs(environment);

-- Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Authenticated users can insert their own errors
CREATE POLICY "Users can insert their own errors" ON error_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Admins can view all errors for their tenant
CREATE POLICY "Admins can view tenant errors" ON error_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
      AND u.tenant_id = error_logs.tenant_id
      AND u.role IN ('admin', 'tenant_admin')
    )
  );

-- Service role can bypass RLS
CREATE POLICY "Service role can manage all errors" ON error_logs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Add comment
COMMENT ON TABLE error_logs IS 'Stores application errors for monitoring and debugging';
