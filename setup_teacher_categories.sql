-- Setup teacher_categories table with test data
-- This ensures that staff members are assigned to categories

-- 1. Check current teacher_categories data
SELECT 
  tc.teacher_id,
  u.first_name,
  u.last_name,
  tc.category_id,
  c.code as category_code,
  c.name as category_name
FROM teacher_categories tc
JOIN users u ON u.id = tc.teacher_id
JOIN categories c ON c.id = tc.category_id
WHERE u.role = 'staff'
  AND u.is_active = true
ORDER BY u.first_name, c.code;

-- 2. Get all active staff members
SELECT 
  id,
  first_name,
  last_name,
  email,
  role,
  tenant_id
FROM users 
WHERE role = 'staff' 
  AND is_active = true
  AND tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
ORDER BY first_name;

-- 3. Get all categories for the tenant
SELECT 
  id,
  code,
  name,
  tenant_id
FROM categories 
WHERE is_active = true
  AND tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
ORDER BY code;

-- 4. Insert teacher_categories for all staff members and categories
-- This assigns all staff to all categories (you can modify this as needed)
INSERT INTO teacher_categories (teacher_id, category_id)
SELECT 
  u.id as teacher_id,
  c.id as category_id
FROM users u
CROSS JOIN categories c
WHERE u.role = 'staff'
  AND u.is_active = true
  AND u.tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
  AND c.is_active = true
  AND c.tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
  AND NOT EXISTS (
    SELECT 1 FROM teacher_categories tc 
    WHERE tc.teacher_id = u.id 
    AND tc.category_id = c.id
  );

-- 5. Verify the insertions
SELECT 
  tc.teacher_id,
  u.first_name,
  u.last_name,
  tc.category_id,
  c.code as category_code,
  c.name as category_name
FROM teacher_categories tc
JOIN users u ON u.id = tc.teacher_id
JOIN categories c ON c.id = tc.category_id
WHERE u.role = 'staff'
  AND u.is_active = true
  AND u.tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
ORDER BY u.first_name, c.code;
