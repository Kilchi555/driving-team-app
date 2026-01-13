-- Create audit_logs table for application-wide audit logging
-- Used by payment APIs, user actions, admin operations, etc.

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User Information
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  auth_user_id UUID, -- Store auth.uid() when user_id is not yet known
  
  -- Action Details
  action VARCHAR(100) NOT NULL, -- e.g., 'process_payment', 'create_appointment', 'delete_user'
  resource_type VARCHAR(100), -- e.g., 'payment', 'appointment', 'user'
  resource_id UUID, -- ID of the affected resource
  
  -- Status & Result
  status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'error', 'started', 'failed', 'partial', 'skipped')),
  error_message TEXT, -- If status = 'error' or 'failed'
  
  -- Additional Data
  details JSONB DEFAULT '{}'::jsonb, -- Extra context (e.g., payment_method, amount, etc.)
  ip_address INET, -- Client IP address
  user_agent TEXT, -- Browser/Client info
  
  -- Tenant Information
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON public.audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON public.audit_logs(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_action ON public.audit_logs(tenant_id, action);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- 1. Service role (API servers) can do everything - needed for audit logging
DROP POLICY IF EXISTS "audit_logs_service_role_all" ON public.audit_logs;
CREATE POLICY "audit_logs_service_role_all" ON public.audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Authenticated users (staff/admins) can read their tenant's audit logs
DROP POLICY IF EXISTS "audit_logs_authenticated_read_tenant" ON public.audit_logs;
CREATE POLICY "audit_logs_authenticated_read_tenant" ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users
      WHERE auth_user_id = auth.uid()
        AND role IN ('admin', 'staff', 'tenant_admin')
        AND is_active = true
    )
  );

-- 3. Super admins can read all audit logs
DROP POLICY IF EXISTS "audit_logs_super_admin_read_all" ON public.audit_logs;
CREATE POLICY "audit_logs_super_admin_read_all" ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

-- 4. Authenticated users can read their own audit log entries (self-read)
DROP POLICY IF EXISTS "audit_logs_authenticated_read_own" ON public.audit_logs;
CREATE POLICY "audit_logs_authenticated_read_own" ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
  );

-- Add comments
COMMENT ON TABLE public.audit_logs IS 'Audit log table for tracking all important user and system actions';
COMMENT ON COLUMN public.audit_logs.user_id IS 'User who performed the action';
COMMENT ON COLUMN public.audit_logs.action IS 'Action performed (e.g., process_payment, create_appointment)';
COMMENT ON COLUMN public.audit_logs.resource_type IS 'Type of resource affected (e.g., payment, appointment)';
COMMENT ON COLUMN public.audit_logs.resource_id IS 'ID of the resource affected';
COMMENT ON COLUMN public.audit_logs.status IS 'Result of the action (success, error, failed, etc.)';
COMMENT ON COLUMN public.audit_logs.details IS 'Additional context as JSON (payment_method, amount, reason, etc.)';

