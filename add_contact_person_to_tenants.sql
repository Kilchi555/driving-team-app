-- Add contact person fields to tenants table
-- This adds first_name and last_name columns for the contact person

ALTER TABLE tenants 
ADD COLUMN contact_person_first_name VARCHAR(100),
ADD COLUMN contact_person_last_name VARCHAR(100);

-- Add comments for documentation
COMMENT ON COLUMN tenants.contact_person_first_name IS 'First name of the contact person for this tenant';
COMMENT ON COLUMN tenants.contact_person_last_name IS 'Last name of the contact person for this tenant';

-- Update existing tenants with default values if needed (optional)
-- UPDATE tenants 
-- SET contact_person_first_name = 'Admin', 
--     contact_person_last_name = 'User'
-- WHERE contact_person_first_name IS NULL;
