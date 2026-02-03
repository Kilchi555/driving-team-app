-- Create cancellation_reasons table with proper structure
-- This table stores cancellation reason codes for lessons, exams, and theory sessions

CREATE TABLE IF NOT EXISTS public.cancellation_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Code for internal reference
  code VARCHAR(50) NOT NULL,
  
  -- Localized names and descriptions
  name_de VARCHAR(255) NOT NULL,
  description_de TEXT,
  
  -- Type of cancellation (student or staff initiated)
  cancellation_type VARCHAR(20) CHECK (cancellation_type IN ('student', 'staff')),
  
  -- Charge percentage for cancellation policy (0-100)
  charge_percentage INTEGER DEFAULT 0 CHECK (charge_percentage >= 0 AND charge_percentage <= 100),
  
  -- Whether medical certificate is required for this reason
  requires_medical_certificate BOOLEAN DEFAULT FALSE,
  
  -- Sort order for UI display
  sort_order INTEGER DEFAULT 999,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Unique constraint per tenant and code
  UNIQUE (tenant_id, code)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_cancellation_reasons_tenant_id 
  ON public.cancellation_reasons(tenant_id);

CREATE INDEX IF NOT EXISTS idx_cancellation_reasons_is_active 
  ON public.cancellation_reasons(is_active);

CREATE INDEX IF NOT EXISTS idx_cancellation_reasons_type 
  ON public.cancellation_reasons(cancellation_type);

CREATE INDEX IF NOT EXISTS idx_cancellation_reasons_tenant_active 
  ON public.cancellation_reasons(tenant_id, is_active);

-- RLS Policies
ALTER TABLE public.cancellation_reasons ENABLE ROW LEVEL SECURITY;

-- Allow admins to see all reasons for their tenant
CREATE POLICY "cancellation_reasons_admin_select" 
  ON public.cancellation_reasons 
  FOR SELECT 
  USING (
    auth.uid() IN (
      SELECT DISTINCT users.auth_user_id 
      FROM public.users 
      WHERE users.tenant_id = cancellation_reasons.tenant_id 
        AND users.role IN ('admin', 'super_admin')
    )
  );

-- Allow all authenticated users to see active reasons for their tenant
CREATE POLICY "cancellation_reasons_user_select" 
  ON public.cancellation_reasons 
  FOR SELECT 
  USING (
    is_active = TRUE 
    AND auth.uid() IN (
      SELECT DISTINCT users.auth_user_id 
      FROM public.users 
      WHERE users.tenant_id = cancellation_reasons.tenant_id
    )
  );

-- Allow admins to insert
CREATE POLICY "cancellation_reasons_admin_insert" 
  ON public.cancellation_reasons 
  FOR INSERT 
  WITH CHECK (
    auth.uid() IN (
      SELECT DISTINCT users.auth_user_id 
      FROM public.users 
      WHERE users.tenant_id = cancellation_reasons.tenant_id 
        AND users.role IN ('admin', 'super_admin')
    )
  );

-- Allow admins to update
CREATE POLICY "cancellation_reasons_admin_update" 
  ON public.cancellation_reasons 
  FOR UPDATE 
  USING (
    auth.uid() IN (
      SELECT DISTINCT users.auth_user_id 
      FROM public.users 
      WHERE users.tenant_id = cancellation_reasons.tenant_id 
        AND users.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT DISTINCT users.auth_user_id 
      FROM public.users 
      WHERE users.tenant_id = cancellation_reasons.tenant_id 
        AND users.role IN ('admin', 'super_admin')
    )
  );

-- Allow admins to delete
CREATE POLICY "cancellation_reasons_admin_delete" 
  ON public.cancellation_reasons 
  FOR DELETE 
  USING (
    auth.uid() IN (
      SELECT DISTINCT users.auth_user_id 
      FROM public.users 
      WHERE users.tenant_id = cancellation_reasons.tenant_id 
        AND users.role IN ('admin', 'super_admin')
    )
  );
