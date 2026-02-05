-- Fix logo URLs that are missing bucket name in Supabase Storage paths
-- Convert: /storage/v1/object/public/filename.png
-- To: /storage/v1/object/public/logos/filename.png

BEGIN;

-- Update logo_url, logo_square_url, and logo_wide_url if they don't have the bucket name
UPDATE public.tenants
SET logo_url = CASE 
  WHEN logo_url LIKE '/storage/v1/object/public/%' AND NOT logo_url LIKE '/storage/v1/object/public/logos/%'
  THEN '/storage/v1/object/public/logos/' || SUBSTRING(logo_url FROM 31)
  ELSE logo_url
END
WHERE logo_url LIKE '/storage/v1/object/public/%' AND NOT logo_url LIKE '/storage/v1/object/public/logos/%';

UPDATE public.tenants
SET logo_square_url = CASE 
  WHEN logo_square_url LIKE '/storage/v1/object/public/%' AND NOT logo_square_url LIKE '/storage/v1/object/public/logos/%'
  THEN '/storage/v1/object/public/logos/' || SUBSTRING(logo_square_url FROM 31)
  ELSE logo_square_url
END
WHERE logo_square_url LIKE '/storage/v1/object/public/%' AND NOT logo_square_url LIKE '/storage/v1/object/public/logos/%';

UPDATE public.tenants
SET logo_wide_url = CASE 
  WHEN logo_wide_url LIKE '/storage/v1/object/public/%' AND NOT logo_wide_url LIKE '/storage/v1/object/public/logos/%'
  THEN '/storage/v1/object/public/logos/' || SUBSTRING(logo_wide_url FROM 31)
  ELSE logo_wide_url
END
WHERE logo_wide_url LIKE '/storage/v1/object/public/%' AND NOT logo_wide_url LIKE '/storage/v1/object/public/logos/%';

COMMIT;
