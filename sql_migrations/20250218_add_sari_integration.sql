-- SQL Migration: Add SARI Integration Tables and Columns
-- Date: 2025-01-18
-- Purpose: Add support for Kyberna SARI API integration

-- 1. Add SARI columns to tenants table
ALTER TABLE IF EXISTS public.tenants
ADD COLUMN IF NOT EXISTS sari_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sari_environment VARCHAR(20) DEFAULT 'test',
ADD COLUMN IF NOT EXISTS sari_client_id TEXT,
ADD COLUMN IF NOT EXISTS sari_client_secret TEXT,
ADD COLUMN IF NOT EXISTS sari_username TEXT,
ADD COLUMN IF NOT EXISTS sari_password TEXT,
ADD COLUMN IF NOT EXISTS sari_last_sync_at TIMESTAMP WITH TIME ZONE;

-- 2. Add SARI columns to course_categories table
ALTER TABLE IF EXISTS public.course_categories
ADD COLUMN IF NOT EXISTS sari_category_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS sari_course_type VARCHAR(10); -- 'VKU' or 'PGS'

-- 3. Add SARI columns to courses table
ALTER TABLE IF EXISTS public.courses
ADD COLUMN IF NOT EXISTS sari_course_id INTEGER,
ADD COLUMN IF NOT EXISTS sari_last_sync_at TIMESTAMP WITH TIME ZONE;

-- 4. Add SARI columns to users table
ALTER TABLE IF EXISTS public.users
ADD COLUMN IF NOT EXISTS sari_faberid VARCHAR(20),
ADD COLUMN IF NOT EXISTS sari_birthdate DATE;

-- 5. Create sari_sync_logs table
CREATE TABLE IF NOT EXISTS public.sari_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  operation VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'success', 'error', 'partial'
  result JSONB,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for sari_sync_logs
CREATE INDEX IF NOT EXISTS sari_sync_logs_tenant_id_created_at_idx
  ON public.sari_sync_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sari_sync_logs_operation_status_idx
  ON public.sari_sync_logs(operation, status);

-- 6. Create sari_customer_mapping table
CREATE TABLE IF NOT EXISTS public.sari_customer_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sari_faberid VARCHAR(20) NOT NULL,
  simy_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  birthdate DATE,
  last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, sari_faberid)
);

-- Create indexes for sari_customer_mapping
CREATE INDEX IF NOT EXISTS sari_customer_mapping_tenant_id_faberid_idx
  ON public.sari_customer_mapping(tenant_id, sari_faberid);
CREATE INDEX IF NOT EXISTS sari_customer_mapping_simy_user_id_idx
  ON public.sari_customer_mapping(simy_user_id);

-- 7. Create sari_course_mapping table (for tracking course sync)
CREATE TABLE IF NOT EXISTS public.sari_course_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sari_course_id INTEGER NOT NULL,
  simy_course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  course_type VARCHAR(10), -- 'VKU' or 'PGS'
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, sari_course_id)
);

-- Create indexes for sari_course_mapping
CREATE INDEX IF NOT EXISTS sari_course_mapping_tenant_id_course_type_idx
  ON public.sari_course_mapping(tenant_id, course_type);
CREATE INDEX IF NOT EXISTS sari_course_mapping_simy_course_id_idx
  ON public.sari_course_mapping(simy_course_id);

-- 8. Enable RLS on new tables
ALTER TABLE public.sari_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sari_customer_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sari_course_mapping ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for sari_sync_logs
DROP POLICY IF EXISTS "Tenants can view their own SARI sync logs" ON public.sari_sync_logs;
CREATE POLICY "Tenants can view their own SARI sync logs"
  ON public.sari_sync_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
      AND users.tenant_id = sari_sync_logs.tenant_id
      AND users.role IN ('admin', 'staff')
    )
  );

DROP POLICY IF EXISTS "Service role can insert SARI sync logs" ON public.sari_sync_logs;
CREATE POLICY "Service role can insert SARI sync logs"
  ON public.sari_sync_logs
  FOR INSERT
  WITH CHECK (true); -- Only backend service role will use this

-- 10. Create RLS policies for sari_customer_mapping
DROP POLICY IF EXISTS "Tenants can view their customer mappings" ON public.sari_customer_mapping;
CREATE POLICY "Tenants can view their customer mappings"
  ON public.sari_customer_mapping
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
      AND users.tenant_id = sari_customer_mapping.tenant_id
      AND users.role IN ('admin', 'staff')
    )
  );

-- 11. Create RLS policies for sari_course_mapping
DROP POLICY IF EXISTS "Tenants can view their course mappings" ON public.sari_course_mapping;
CREATE POLICY "Tenants can view their course mappings"
  ON public.sari_course_mapping
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
      AND users.tenant_id = sari_course_mapping.tenant_id
      AND users.role IN ('admin', 'staff')
    )
  );

-- 12. Add index to courses for sari_course_id lookups
CREATE INDEX IF NOT EXISTS courses_sari_course_id_tenant_id_idx
  ON public.courses(sari_course_id, tenant_id);

-- 13. Add index to users for sari_faberid lookups
CREATE INDEX IF NOT EXISTS users_sari_faberid_tenant_id_idx
  ON public.users(sari_faberid, tenant_id);

-- 14. Create view for sync status
DROP VIEW IF EXISTS public.sari_sync_status;
CREATE VIEW public.sari_sync_status AS
SELECT 
  t.id as tenant_id,
  t.name,
  t.sari_enabled,
  t.sari_environment,
  t.sari_last_sync_at,
  (SELECT COUNT(*) FROM public.sari_sync_logs WHERE tenant_id = t.id) as total_sync_operations,
  (
    SELECT status FROM public.sari_sync_logs 
    WHERE tenant_id = t.id 
    ORDER BY created_at DESC 
    LIMIT 1
  ) as last_sync_status,
  (
    SELECT created_at FROM public.sari_sync_logs 
    WHERE tenant_id = t.id 
    ORDER BY created_at DESC 
    LIMIT 1
  ) as last_sync_at
FROM public.tenants t
WHERE t.sari_enabled = TRUE;

-- Grant permissions on view
GRANT SELECT ON public.sari_sync_status TO authenticated;

