-- Phase 2: Add-on pages (location / category / prices)
ALTER TABLE website_pages
  ADD COLUMN IF NOT EXISTS page_type TEXT NOT NULL DEFAULT 'home',
  ADD COLUMN IF NOT EXISTS source_ref UUID NULL,
  ADD COLUMN IF NOT EXISTS addon_inputs JSONB NULL;

ALTER TABLE website_pages
  DROP CONSTRAINT IF EXISTS website_pages_page_type_check;

ALTER TABLE website_pages
  ADD CONSTRAINT website_pages_page_type_check
  CHECK (page_type IN ('home', 'location', 'category', 'prices'));

UPDATE website_pages SET page_type = 'home' WHERE is_home = true AND (page_type IS NULL OR page_type = 'home');

CREATE INDEX IF NOT EXISTS idx_website_pages_page_type ON website_pages(website_id, page_type);

ALTER TABLE website_tenants
  ADD COLUMN IF NOT EXISTS addon_pages_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN website_pages.page_type IS 'home | location | category | prices';
COMMENT ON COLUMN website_pages.source_ref IS 'Optional locations.id or categories.id';
COMMENT ON COLUMN website_pages.addon_inputs IS 'Tenant inputs for AI generate: keywords, links, notes, photos';
COMMENT ON COLUMN website_tenants.addon_pages_enabled IS 'Superadmin unlock for paid add-on pages (billing later)';
