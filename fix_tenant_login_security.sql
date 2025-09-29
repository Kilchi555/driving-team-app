-- Fix tenant login security issue
-- Ensure users can only login to their assigned tenant

-- 1. Create function to validate user-tenant login
CREATE OR REPLACE FUNCTION validate_user_tenant_login(
    user_email TEXT,
    tenant_slug TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    user_tenant_id UUID;
    expected_tenant_id UUID;
BEGIN
    -- Get user's tenant_id from database
    SELECT tenant_id INTO user_tenant_id
    FROM users 
    WHERE email = user_email 
    AND is_active = true
    AND deleted_at IS NULL;
    
    -- Get expected tenant_id from slug
    SELECT id INTO expected_tenant_id
    FROM tenants 
    WHERE slug = tenant_slug 
    AND is_active = true;
    
    -- Check if user belongs to the selected tenant
    IF user_tenant_id IS NULL OR expected_tenant_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN user_tenant_id = expected_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create function to get user's correct tenant slug
CREATE OR REPLACE FUNCTION get_user_tenant_slug(user_email TEXT) 
RETURNS TEXT AS $$
DECLARE
    tenant_slug TEXT;
BEGIN
    SELECT t.slug INTO tenant_slug
    FROM users u
    JOIN tenants t ON u.tenant_id = t.id
    WHERE u.email = user_email 
    AND u.is_active = true
    AND u.deleted_at IS NULL
    AND t.is_active = true;
    
    RETURN tenant_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Test the functions
DO $$
BEGIN
    -- Test validation function
    RAISE NOTICE 'Testing tenant login validation:';
    
    -- Should return TRUE (user belongs to tenant)
    RAISE NOTICE 'Valid login test: %', 
        validate_user_tenant_login('info@drivingteam.ch', 'driving-team');
    
    -- Should return FALSE (user does not belong to tenant)
    RAISE NOTICE 'Invalid login test: %', 
        validate_user_tenant_login('admin@drivingteam.ch', 'driving-team');
    
    -- Test get tenant slug function
    RAISE NOTICE 'User tenant slug: %', 
        get_user_tenant_slug('info@drivingteam.ch');
END $$;
