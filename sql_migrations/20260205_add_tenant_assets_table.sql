-- Create tenant_assets table for managing logos, icons, and other assets
-- This replaces storing Base64 data directly in the tenants table

BEGIN;

-- Create the tenant_assets table for tracking all tenant branding assets
CREATE TABLE IF NOT EXISTS public.tenant_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Asset classification
  asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN ('logo', 'logo_square', 'logo_wide', 'favicon', 'icon', 'banner')),
  
  -- File information
  file_path TEXT NOT NULL, -- e.g. "tenant-assets/{tenant_id}/logo.png"
  format VARCHAR(10) NOT NULL CHECK (format IN ('png', 'jpg', 'jpeg', 'svg', 'webp', 'gif')),
  mime_type VARCHAR(100),
  file_size_bytes INTEGER,
  
  -- Storage metadata
  storage_bucket VARCHAR(100) DEFAULT 'tenant-assets',
  url TEXT, -- Full Supabase public URL
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Ensure one asset per type per tenant
  UNIQUE(tenant_id, asset_type)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenant_assets_tenant_id ON public.tenant_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_assets_type ON public.tenant_assets(asset_type);

-- Add comments
COMMENT ON TABLE public.tenant_assets IS 'Centralized management of tenant assets (logos, icons, favicons) stored in Supabase Storage';
COMMENT ON COLUMN public.tenant_assets.asset_type IS 'Type of asset: logo, logo_square, logo_wide, favicon, icon, or banner';
COMMENT ON COLUMN public.tenant_assets.file_path IS 'Path relative to storage bucket, e.g. tenant-assets/uuid/logo.png';
COMMENT ON COLUMN public.tenant_assets.format IS 'File format: png, jpg, jpeg, svg, webp, or gif';
COMMENT ON COLUMN public.tenant_assets.url IS 'Full public URL from Supabase Storage for easy access';

-- Enable RLS
ALTER TABLE public.tenant_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view assets of their tenant
CREATE POLICY tenant_assets_view ON public.tenant_assets 
  FOR SELECT 
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid() AND is_active = true
    )
    OR 
    -- Allow public access to logos for receipts/public pages
    asset_type IN ('logo', 'logo_wide', 'logo_square', 'favicon')
  );

-- RLS Policy: Only tenant admins can insert assets
CREATE POLICY tenant_assets_insert ON public.tenant_assets 
  FOR INSERT 
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() AND is_active = true AND role = 'admin'
    )
  );

-- RLS Policy: Only tenant admins can update assets
CREATE POLICY tenant_assets_update ON public.tenant_assets 
  FOR UPDATE 
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() AND is_active = true AND role = 'admin'
    )
  );

-- RLS Policy: Only tenant admins can delete assets
CREATE POLICY tenant_assets_delete ON public.tenant_assets 
  FOR DELETE 
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() AND is_active = true AND role = 'admin'
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_tenant_assets_timestamp 
  BEFORE UPDATE ON public.tenant_assets 
  FOR EACH ROW 
  EXECUTE FUNCTION update_timestamp();

COMMIT;
