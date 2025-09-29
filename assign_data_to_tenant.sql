-- Assign existing data to the new tenant
-- This ensures all existing users, appointments, and payments are associated with the tenant

-- 1) Get the tenant ID
DO $$ 
DECLARE
  tenant_uuid UUID;
  updated_users INTEGER;
  updated_appointments INTEGER;
  updated_payments INTEGER;
BEGIN
  -- Get the tenant ID
  SELECT id INTO tenant_uuid FROM tenants WHERE slug = 'driving-team-real' LIMIT 1;
  
  IF tenant_uuid IS NOT NULL THEN
    -- Update users table
    UPDATE users 
    SET tenant_id = tenant_uuid 
    WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';
    
    GET DIAGNOSTICS updated_users = ROW_COUNT;
    
    -- Update appointments table (if it exists and has tenant_id column)
    BEGIN
      UPDATE appointments 
      SET tenant_id = tenant_uuid 
      WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';
      
      GET DIAGNOSTICS updated_appointments = ROW_COUNT;
    EXCEPTION
      WHEN undefined_column THEN
        updated_appointments := 0;
        RAISE NOTICE 'appointments.tenant_id column does not exist';
    END;
    
    -- Update payments table (if it exists and has tenant_id column)
    BEGIN
      UPDATE payments 
      SET tenant_id = tenant_uuid 
      WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';
      
      GET DIAGNOSTICS updated_payments = ROW_COUNT;
    EXCEPTION
      WHEN undefined_column THEN
        updated_payments := 0;
        RAISE NOTICE 'payments.tenant_id column does not exist';
    END;
    
    RAISE NOTICE 'Data assignment completed:';
    RAISE NOTICE '- Updated users: %', updated_users;
    RAISE NOTICE '- Updated appointments: %', updated_appointments;
    RAISE NOTICE '- Updated payments: %', updated_payments;
    RAISE NOTICE '- Tenant ID: %', tenant_uuid;
  ELSE
    RAISE NOTICE 'No tenant found with slug driving-team-real';
  END IF;
END $$;

-- 2) Verify the assignment
SELECT 
  'users' as table_name,
  COUNT(*) as total_records,
  COUNT(tenant_id) as records_with_tenant_id,
  COUNT(CASE WHEN tenant_id = '64259d68-195a-4c68-8875-f1b44d962830' THEN 1 END) as records_with_correct_tenant
FROM users

UNION ALL

SELECT 
  'appointments' as table_name,
  COUNT(*) as total_records,
  COUNT(tenant_id) as records_with_tenant_id,
  COUNT(CASE WHEN tenant_id = '64259d68-195a-4c68-8875-f1b44d962830' THEN 1 END) as records_with_correct_tenant
FROM appointments

UNION ALL

SELECT 
  'payments' as table_name,
  COUNT(*) as total_records,
  COUNT(tenant_id) as records_with_tenant_id,
  COUNT(CASE WHEN tenant_id = '64259d68-195a-4c68-8875-f1b44d962830' THEN 1 END) as records_with_correct_tenant
FROM payments;
