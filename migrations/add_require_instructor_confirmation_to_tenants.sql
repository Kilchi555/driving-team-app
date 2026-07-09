-- Add require_instructor_confirmation flag to tenants table
-- This controls whether staff instructors must confirm course sessions before the course can be activated
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS require_instructor_confirmation BOOLEAN DEFAULT TRUE;

-- Add comment for clarity
COMMENT ON COLUMN tenants.require_instructor_confirmation IS 'If true, course sessions require instructor confirmation before course activation. If false, confirmation is optional and courses can be activated immediately.';
