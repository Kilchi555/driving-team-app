-- Migration: Migrate Base64 logos to Supabase Storage
-- This migration is OPTIONAL and can be run later when you want to move
-- existing Base64 data URLs to Supabase Storage

-- Note: This SQL only prepares the structure. The actual file upload needs
-- to be done via the Node.js migration script (see migration-script-logos-to-storage.ts)

BEGIN;

-- Create a temporary column to track migration status
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS logo_migrated BOOLEAN DEFAULT false;

-- Backfill tenant_assets from existing logo columns (for non-Base64 URLs)
INSERT INTO public.tenant_assets (tenant_id, asset_type, file_path, format, mime_type, url, created_at, updated_at)
SELECT 
  t.id,
  'logo_square',
  CONCAT('tenant-assets/', t.id, '/logo-square.', 
    CASE 
      WHEN t.logo_square_url LIKE '%.svg%' THEN 'svg'
      WHEN t.logo_square_url LIKE '%.jpg%' THEN 'jpg'
      WHEN t.logo_square_url LIKE '%.jpeg%' THEN 'jpeg'
      WHEN t.logo_square_url LIKE '%.webp%' THEN 'webp'
      ELSE 'png' 
    END
  ),
  CASE 
    WHEN t.logo_square_url LIKE '%.svg%' THEN 'svg'
    WHEN t.logo_square_url LIKE '%.jpg%' THEN 'jpg'
    WHEN t.logo_square_url LIKE '%.jpeg%' THEN 'jpeg'
    WHEN t.logo_square_url LIKE '%.webp%' THEN 'webp'
    ELSE 'png' 
  END,
  CASE 
    WHEN t.logo_square_url LIKE '%.svg%' THEN 'image/svg+xml'
    WHEN t.logo_square_url LIKE '%.jpg%' OR t.logo_square_url LIKE '%.jpeg%' THEN 'image/jpeg'
    WHEN t.logo_square_url LIKE '%.webp%' THEN 'image/webp'
    ELSE 'image/png' 
  END,
  t.logo_square_url,
  t.created_at,
  t.updated_at
FROM public.tenants t
WHERE 
  t.logo_square_url IS NOT NULL 
  AND NOT t.logo_square_url LIKE 'data:%'
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_assets 
    WHERE tenant_id = t.id AND asset_type = 'logo_square'
  )
ON CONFLICT (tenant_id, asset_type) DO NOTHING;

-- Similar for logo_wide
INSERT INTO public.tenant_assets (tenant_id, asset_type, file_path, format, mime_type, url, created_at, updated_at)
SELECT 
  t.id,
  'logo_wide',
  CONCAT('tenant-assets/', t.id, '/logo-wide.', 
    CASE 
      WHEN t.logo_wide_url LIKE '%.svg%' THEN 'svg'
      WHEN t.logo_wide_url LIKE '%.jpg%' THEN 'jpg'
      WHEN t.logo_wide_url LIKE '%.jpeg%' THEN 'jpeg'
      WHEN t.logo_wide_url LIKE '%.webp%' THEN 'webp'
      ELSE 'png' 
    END
  ),
  CASE 
    WHEN t.logo_wide_url LIKE '%.svg%' THEN 'svg'
    WHEN t.logo_wide_url LIKE '%.jpg%' THEN 'jpg'
    WHEN t.logo_wide_url LIKE '%.jpeg%' THEN 'jpeg'
    WHEN t.logo_wide_url LIKE '%.webp%' THEN 'webp'
    ELSE 'png' 
  END,
  CASE 
    WHEN t.logo_wide_url LIKE '%.svg%' THEN 'image/svg+xml'
    WHEN t.logo_wide_url LIKE '%.jpg%' OR t.logo_wide_url LIKE '%.jpeg%' THEN 'image/jpeg'
    WHEN t.logo_wide_url LIKE '%.webp%' THEN 'image/webp'
    ELSE 'image/png' 
  END,
  t.logo_wide_url,
  t.created_at,
  t.updated_at
FROM public.tenants t
WHERE 
  t.logo_wide_url IS NOT NULL 
  AND NOT t.logo_wide_url LIKE 'data:%'
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_assets 
    WHERE tenant_id = t.id AND asset_type = 'logo_wide'
  )
ON CONFLICT (tenant_id, asset_type) DO NOTHING;

-- Similar for logo_url (generic logo)
INSERT INTO public.tenant_assets (tenant_id, asset_type, file_path, format, mime_type, url, created_at, updated_at)
SELECT 
  t.id,
  'logo',
  CONCAT('tenant-assets/', t.id, '/logo.', 
    CASE 
      WHEN t.logo_url LIKE '%.svg%' THEN 'svg'
      WHEN t.logo_url LIKE '%.jpg%' THEN 'jpg'
      WHEN t.logo_url LIKE '%.jpeg%' THEN 'jpeg'
      WHEN t.logo_url LIKE '%.webp%' THEN 'webp'
      ELSE 'png' 
    END
  ),
  CASE 
    WHEN t.logo_url LIKE '%.svg%' THEN 'svg'
    WHEN t.logo_url LIKE '%.jpg%' THEN 'jpg'
    WHEN t.logo_url LIKE '%.jpeg%' THEN 'jpeg'
    WHEN t.logo_url LIKE '%.webp%' THEN 'webp'
    ELSE 'png' 
  END,
  CASE 
    WHEN t.logo_url LIKE '%.svg%' THEN 'image/svg+xml'
    WHEN t.logo_url LIKE '%.jpg%' OR t.logo_url LIKE '%.jpeg%' THEN 'image/jpeg'
    WHEN t.logo_url LIKE '%.webp%' THEN 'image/webp'
    ELSE 'image/png' 
  END,
  t.logo_url,
  t.created_at,
  t.updated_at
FROM public.tenants t
WHERE 
  t.logo_url IS NOT NULL 
  AND NOT t.logo_url LIKE 'data:%'
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_assets 
    WHERE tenant_id = t.id AND asset_type = 'logo'
  )
ON CONFLICT (tenant_id, asset_type) DO NOTHING;

-- Create view for easy access to current tenant logos
CREATE OR REPLACE VIEW public.vw_tenant_logos AS
SELECT 
  ta.tenant_id,
  MAX(CASE WHEN ta.asset_type = 'logo' THEN ta.url END) as logo_url,
  MAX(CASE WHEN ta.asset_type = 'logo_square' THEN ta.url END) as logo_square_url,
  MAX(CASE WHEN ta.asset_type = 'logo_wide' THEN ta.url END) as logo_wide_url,
  MAX(CASE WHEN ta.asset_type = 'favicon' THEN ta.url END) as favicon_url,
  MAX(ta.updated_at) as last_updated
FROM public.tenant_assets ta
WHERE ta.asset_type IN ('logo', 'logo_square', 'logo_wide', 'favicon')
GROUP BY ta.tenant_id;

COMMIT;
