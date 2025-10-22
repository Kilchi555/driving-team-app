-- Comprehensive database debug query
-- Führt verschiedene Tests durch um herauszufinden warum Max Mustermann nicht geladen wird

-- 1. Alle Studenten im Tenant
SELECT '1. All students in tenant' as test_name, count(*) as count
FROM users 
WHERE role = 'client' 
  AND tenant_id = '64259d68-195a-4c68-8875-f1b44d962830';

-- 2. Alle Studenten mit Details
SELECT '2. Student details' as test_name, 
       id, first_name, last_name, phone, 
       tenant_id, auth_user_id, is_active, 
       assigned_staff_id, onboarding_status
FROM users 
WHERE role = 'client' 
  AND tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
ORDER BY first_name;

-- 3. Max Mustermann spezifisch
SELECT '3. Max Mustermann by ID' as test_name,
       id, first_name, last_name, phone,
       tenant_id, auth_user_id, is_active,
       assigned_staff_id, onboarding_status,
       created_at
FROM users 
WHERE id = 'b09e0af1-3ded-44e0-a80e-b52b11e630e1';

-- 4. Max Mustermann by Name
SELECT '4. Max Mustermann by name' as test_name,
       id, first_name, last_name, phone,
       tenant_id, auth_user_id, is_active
FROM users 
WHERE first_name = 'Max' 
  AND last_name = 'Mustermann'
  AND phone = '+41797157027';

-- 5. Alle Studenten mit assigned_staff_id
SELECT '5. Students with assigned_staff_id' as test_name,
       id, first_name, last_name, 
       assigned_staff_id, is_active, auth_user_id
FROM users 
WHERE role = 'client' 
  AND tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
  AND assigned_staff_id IS NOT NULL;

-- 6. Alle Studenten ohne assigned_staff_id
SELECT '6. Students without assigned_staff_id' as test_name,
       id, first_name, last_name, 
       assigned_staff_id, is_active, auth_user_id
FROM users 
WHERE role = 'client' 
  AND tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
  AND assigned_staff_id IS NULL;

-- 7. Pending Users (auth_user_id = null)
SELECT '7. Pending users' as test_name,
       id, first_name, last_name, 
       auth_user_id, is_active, onboarding_status
FROM users 
WHERE role = 'client' 
  AND tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
  AND auth_user_id IS NULL;

-- 8. Inactive Users (is_active = false)
SELECT '8. Inactive users' as test_name,
       id, first_name, last_name, 
       is_active, auth_user_id, onboarding_status
FROM users 
WHERE role = 'client' 
  AND tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
  AND is_active = false;
