-- Migration: Add website_status and website_approved_by to tenants table
-- This supports the website preview/approval workflow in the superadmin

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS website_status TEXT NOT NULL DEFAULT 'none'
    CHECK (website_status IN ('none', 'pending_review', 'approved', 'live', 'disabled')),
  ADD COLUMN IF NOT EXISTS website_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS website_approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS website_domain TEXT,
  ADD COLUMN IF NOT EXISTS website_notes TEXT;

-- Index for filtering by website_status in superadmin
CREATE INDEX IF NOT EXISTS idx_tenants_website_status ON tenants(website_status);

COMMENT ON COLUMN tenants.website_status IS 'none = no website, pending_review = generated but not yet approved, approved = approved and link sent to client, live = publicly live, disabled = taken offline';
COMMENT ON COLUMN tenants.website_approved_at IS 'Timestamp when superadmin approved and sent the demo link to the client';
COMMENT ON COLUMN tenants.website_approved_by IS 'Superadmin user who approved the website';
COMMENT ON COLUMN tenants.website_domain IS 'Optional custom domain (e.g. www.fahre-schlau.com)';
COMMENT ON COLUMN tenants.website_notes IS 'Internal superadmin notes about this website';
