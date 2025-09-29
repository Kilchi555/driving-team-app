-- Fix existing tenant_id values that are 00000000-0000-0000-0000-000000000000
-- Assign them to the first real tenant

-- 1) Get the first real tenant ID
DO $$ 
DECLARE
  first_tenant_id UUID;
  tenant_count INTEGER;
BEGIN
  -- Check if there are any tenants
  SELECT COUNT(*) INTO tenant_count FROM tenants;
  
  IF tenant_count = 0 THEN
    -- Create a default tenant if none exists
    INSERT INTO tenants (name, slug, subscription_status, subscription_plan, is_active)
    VALUES ('Standard Fahrschule', 'default', 'active', 'basic', true)
    RETURNING id INTO first_tenant_id;
    
    RAISE NOTICE 'Created default tenant: %', first_tenant_id;
  ELSE
    -- Get the first existing tenant
    SELECT id INTO first_tenant_id FROM tenants ORDER BY created_at ASC LIMIT 1;
    RAISE NOTICE 'Using existing tenant: %', first_tenant_id;
  END IF;
  
  -- 2) Update users with NULL or 00000000 tenant_id
  UPDATE users 
  SET tenant_id = first_tenant_id
  WHERE tenant_id IS NULL 
     OR tenant_id = '00000000-0000-0000-0000-000000000000'::uuid;
  
  -- 3) Update appointments with NULL or 00000000 tenant_id
  UPDATE appointments 
  SET tenant_id = first_tenant_id
  WHERE tenant_id IS NULL 
     OR tenant_id = '00000000-0000-0000-0000-000000000000'::uuid;
  
  -- 4) Update payments with NULL or 00000000 tenant_id (falls vorhanden)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    UPDATE payments 
    SET tenant_id = first_tenant_id
    WHERE tenant_id IS NULL 
       OR tenant_id = '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;
  
  -- 5) Show results
  RAISE NOTICE 'Updated users: %', (SELECT COUNT(*) FROM users WHERE tenant_id = first_tenant_id);
  RAISE NOTICE 'Updated appointments: %', (SELECT COUNT(*) FROM appointments WHERE tenant_id = first_tenant_id);
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    RAISE NOTICE 'Updated payments: %', (SELECT COUNT(*) FROM payments WHERE tenant_id = first_tenant_id);
  END IF;
  
END $$;
