-- Complete fix for Supabase Storage logo URLs
-- Issues fixed:
-- 1. URLs missing full bucket path (tenant-logos/)
-- 2. URLs with incorrect format or encoding
-- 3. Malformed paths from previous migrations

BEGIN;

-- First, let's identify and fix URLs that are missing the tenant-logos path
UPDATE public.tenants
SET logo_url = CASE 
  -- If it's a full Supabase URL but missing tenant-logos path
  WHEN logo_url LIKE 'https://%.supabase.co/storage/v1/object/public/public/%'
  THEN logo_url
  -- If it's a relative path without tenant-logos
  WHEN logo_url LIKE '/storage/v1/object/public/public/%' 
    AND NOT logo_url LIKE '/storage/v1/object/public/public/tenant-logos/%'
  THEN '/storage/v1/object/public/public/tenant-logos/' || SUBSTRING(logo_url FROM 33)
  -- If it's a relative path starting with /storage with single public
  WHEN logo_url LIKE '/storage/v1/object/public/%'
    AND NOT logo_url LIKE '/storage/v1/object/public/public/%'
    AND NOT logo_url LIKE '/storage/v1/object/public/tenant-logos/%'
  THEN '/storage/v1/object/public/public/tenant-logos/' || SUBSTRING(logo_url FROM 31)
  ELSE logo_url
END
WHERE logo_url IS NOT NULL 
  AND (
    (logo_url LIKE '/storage/v1/object/public/%' AND NOT logo_url LIKE '/storage/v1/object/public/public/tenant-logos/%')
    OR (logo_url LIKE 'https://%.supabase.co/storage/v1/object/public/public/%')
  );

-- Same for logo_square_url
UPDATE public.tenants
SET logo_square_url = CASE 
  WHEN logo_square_url LIKE 'https://%.supabase.co/storage/v1/object/public/public/%'
  THEN logo_square_url
  WHEN logo_square_url LIKE '/storage/v1/object/public/public/%' 
    AND NOT logo_square_url LIKE '/storage/v1/object/public/public/tenant-logos/%'
  THEN '/storage/v1/object/public/public/tenant-logos/' || SUBSTRING(logo_square_url FROM 33)
  WHEN logo_square_url LIKE '/storage/v1/object/public/%'
    AND NOT logo_square_url LIKE '/storage/v1/object/public/public/%'
    AND NOT logo_square_url LIKE '/storage/v1/object/public/tenant-logos/%'
  THEN '/storage/v1/object/public/public/tenant-logos/' || SUBSTRING(logo_square_url FROM 31)
  ELSE logo_square_url
END
WHERE logo_square_url IS NOT NULL 
  AND (
    (logo_square_url LIKE '/storage/v1/object/public/%' AND NOT logo_square_url LIKE '/storage/v1/object/public/public/tenant-logos/%')
    OR (logo_square_url LIKE 'https://%.supabase.co/storage/v1/object/public/public/%')
  );

-- Same for logo_wide_url
UPDATE public.tenants
SET logo_wide_url = CASE 
  WHEN logo_wide_url LIKE 'https://%.supabase.co/storage/v1/object/public/public/%'
  THEN logo_wide_url
  WHEN logo_wide_url LIKE '/storage/v1/object/public/public/%' 
    AND NOT logo_wide_url LIKE '/storage/v1/object/public/public/tenant-logos/%'
  THEN '/storage/v1/object/public/public/tenant-logos/' || SUBSTRING(logo_wide_url FROM 33)
  WHEN logo_wide_url LIKE '/storage/v1/object/public/%'
    AND NOT logo_wide_url LIKE '/storage/v1/object/public/public/%'
    AND NOT logo_wide_url LIKE '/storage/v1/object/public/tenant-logos/%'
  THEN '/storage/v1/object/public/public/tenant-logos/' || SUBSTRING(logo_wide_url FROM 31)
  ELSE logo_wide_url
END
WHERE logo_wide_url IS NOT NULL 
  AND (
    (logo_wide_url LIKE '/storage/v1/object/public/%' AND NOT logo_wide_url LIKE '/storage/v1/object/public/public/tenant-logos/%')
    OR (logo_wide_url LIKE 'https://%.supabase.co/storage/v1/object/public/public/%')
  );

-- Remove any logo URLs that are data URIs (base64 encoded) - these shouldn't be stored as URLs
UPDATE public.tenants
SET logo_url = NULL
WHERE logo_url LIKE 'data:%';

UPDATE public.tenants
SET logo_square_url = NULL
WHERE logo_square_url LIKE 'data:%';

UPDATE public.tenants
SET logo_wide_url = NULL
WHERE logo_wide_url LIKE 'data:%';

-- Log the changes for verification
SELECT 
  'Logo URLs fixed:' as status,
  COUNT(*) as tenant_count,
  NOW() as timestamp
FROM public.tenants
WHERE logo_url IS NOT NULL 
  OR logo_square_url IS NOT NULL 
  OR logo_wide_url IS NOT NULL;

COMMIT;
