-- Add Wallee configuration to tenants table for multi-tenant support
-- Each tenant can have their own Wallee space with separate sub-account

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS wallee_space_id INTEGER;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS wallee_user_id INTEGER;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS wallee_secret_key TEXT;

-- Add comment to clarify
COMMENT ON COLUMN tenants.wallee_space_id IS 'Wallee Space ID for this tenant (each sub-account has its own space)';
COMMENT ON COLUMN tenants.wallee_user_id IS 'Wallee Application User ID for this tenant';
COMMENT ON COLUMN tenants.wallee_secret_key IS 'Wallee API Secret Key for this tenant (encrypted at rest recommended)';

-- Example for Driving Team sub-account:
-- UPDATE tenants 
-- SET wallee_space_id = 82593,
--     wallee_user_id = 140526,
--     wallee_secret_key = 'YOUR_DRIVING_TEAM_SECRET'
-- WHERE slug = 'driving-team';

