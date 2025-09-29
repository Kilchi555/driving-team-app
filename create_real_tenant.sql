-- Create a real tenant with proper UUID and update all references
-- This replaces the problematic 00000000-0000-0000-0000-000000000000 tenant

DO $$ 
DECLARE
  old_tenant_id UUID := '00000000-0000-0000-0000-000000000000'::uuid;
  new_tenant_id UUID;
  tenant_exists BOOLEAN;
BEGIN
  -- Check if the old tenant exists
  SELECT EXISTS(SELECT 1 FROM tenants WHERE id = old_tenant_id) INTO tenant_exists;
  
  IF tenant_exists THEN
    -- Create a new tenant with proper UUID
    INSERT INTO tenants (
      name, 
      slug, 
      domain,
      contact_email,
      contact_phone,
      address,
      business_type,
      license_number,
      logo_url,
      primary_color,
      secondary_color,
      timezone,
      currency,
      language,
      is_active,
      is_trial,
      trial_ends_at,
      subscription_plan,
      subscription_status,
      created_by,
      updated_by
    )
    SELECT 
      name, 
      slug || '-real',  -- Change slug to avoid conflicts
      domain,
      contact_email,
      contact_phone,
      address,
      business_type,
      license_number,
      logo_url,
      primary_color,
      secondary_color,
      timezone,
      currency,
      language,
      is_active,
      is_trial,
      trial_ends_at,
      subscription_plan,
      subscription_status,
      created_by,
      updated_by
    FROM tenants 
    WHERE id = old_tenant_id
    RETURNING id INTO new_tenant_id;
    
    RAISE NOTICE 'Created new tenant with ID: %', new_tenant_id;
    
    -- Update all references to use the new tenant ID
    UPDATE users 
    SET tenant_id = new_tenant_id
    WHERE tenant_id = old_tenant_id;
    
    UPDATE appointments 
    SET tenant_id = new_tenant_id
    WHERE tenant_id = old_tenant_id;
    
    -- Update payments if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
      UPDATE payments 
      SET tenant_id = new_tenant_id
      WHERE tenant_id = old_tenant_id;
    END IF;
    
    -- Update products if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
      UPDATE products 
      SET tenant_id = new_tenant_id
      WHERE tenant_id = old_tenant_id;
    END IF;
    
    -- Update discounts if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'discounts') THEN
      UPDATE discounts 
      SET tenant_id = new_tenant_id
      WHERE tenant_id = old_tenant_id;
    END IF;
    
    -- Delete the old tenant with 00000000 ID
    DELETE FROM tenants WHERE id = old_tenant_id;
    
    RAISE NOTICE 'Deleted old tenant with 00000000 ID';
    RAISE NOTICE 'Updated users: %', (SELECT COUNT(*) FROM users WHERE tenant_id = new_tenant_id);
    RAISE NOTICE 'Updated appointments: %', (SELECT COUNT(*) FROM appointments WHERE tenant_id = new_tenant_id);
    
  ELSE
    RAISE NOTICE 'No tenant with 00000000 ID found, nothing to fix';
  END IF;
  
END $$;
