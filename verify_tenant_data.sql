-- Verify that data has been assigned to the tenant
-- This shows the current state of tenant assignments

-- 1) Show tenant info
SELECT 
  id,
  name,
  slug,
  is_active,
  is_trial,
  subscription_plan,
  subscription_status
FROM tenants;

-- 2) Check users assigned to tenant
SELECT 
  'users' as table_name,
  COUNT(*) as total_records,
  COUNT(tenant_id) as records_with_tenant_id,
  COUNT(CASE WHEN tenant_id = '64259d68-195a-4c68-8875-f1b44d962830' THEN 1 END) as records_with_correct_tenant,
  COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as records_without_tenant_id
FROM users;

-- 3) Check appointments assigned to tenant (if table exists)
SELECT 
  'appointments' as table_name,
  COUNT(*) as total_records,
  COUNT(tenant_id) as records_with_tenant_id,
  COUNT(CASE WHEN tenant_id = '64259d68-195a-4c68-8875-f1b44d962830' THEN 1 END) as records_with_correct_tenant,
  COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as records_without_tenant_id
FROM appointments;

-- 4) Check payments assigned to tenant (if table exists)
SELECT 
  'payments' as table_name,
  COUNT(*) as total_records,
  COUNT(tenant_id) as records_with_tenant_id,
  COUNT(CASE WHEN tenant_id = '64259d68-195a-4c68-8875-f1b44d962830' THEN 1 END) as records_with_correct_tenant,
  COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as records_without_tenant_id
FROM payments;

-- 5) Show sample users with their tenant assignments
SELECT 
  id,
  email,
  role,
  tenant_id,
  CASE 
    WHEN tenant_id = '64259d68-195a-4c68-8875-f1b44d962830' THEN '✅ Correct Tenant'
    WHEN tenant_id IS NULL THEN '❌ No Tenant'
    ELSE '⚠️ Wrong Tenant'
  END as tenant_status
FROM users
LIMIT 10;
