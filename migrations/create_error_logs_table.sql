/**
 * Migration: Create error_logs table
 * 
 * This table stores error logs from the client and server for debugging and monitoring.
 */

-- Create error_logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  component TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  url TEXT,
  user_agent TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for fast queries
  UNIQUE(id),
  CHECK (created_at IS NOT NULL)
);

-- Create indexes for querying
CREATE INDEX IF NOT EXISTS idx_error_logs_tenant_id ON error_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_component ON error_logs(component);
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON error_logs(level);
CREATE INDEX IF NOT EXISTS idx_error_logs_tenant_created ON error_logs(tenant_id, created_at DESC);

-- Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- 1. Users can see their own error logs (or admins can see all in their tenant)
CREATE POLICY "Users can see their own error logs" ON error_logs
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.tenant_id = error_logs.tenant_id
      AND u.role IN ('admin', 'staff')
    )
  );

-- 2. Allow authenticated users to insert their own error logs
CREATE POLICY "Users can insert their own error logs" ON error_logs
  FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id OR user_id IS NULL)
    AND (
      EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.tenant_id = error_logs.tenant_id
      ) OR tenant_id IS NULL
    )
  );

-- 3. Admins can delete error logs from their tenant
CREATE POLICY "Admins can delete error logs from their tenant" ON error_logs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.tenant_id = error_logs.tenant_id
      AND u.role = 'admin'
    )
  );

