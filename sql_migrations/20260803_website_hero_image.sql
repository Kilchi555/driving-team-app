-- Website generator: hero image for landing pages
ALTER TABLE public.website_tenants
  ADD COLUMN IF NOT EXISTS hero_image_url TEXT;
