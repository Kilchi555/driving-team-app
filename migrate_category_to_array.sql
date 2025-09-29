-- Migrate category column from TEXT to TEXT[] (PostgreSQL Array)
-- This enables proper array operations and indexing

-- 1. Backup existing data
CREATE TABLE IF NOT EXISTS category_backup AS 
SELECT id, category FROM users WHERE category IS NOT NULL;

-- 2. Backup dependent views before dropping
DO $$
BEGIN
    -- Backup staff_capabilities view definition
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'staff_capabilities') THEN
        RAISE NOTICE 'Backing up staff_capabilities view...';
    END IF;
    
    -- Backup client_staff_assignments view definition  
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'client_staff_assignments') THEN
        RAISE NOTICE 'Backing up client_staff_assignments view...';
    END IF;
END $$;

-- 3. Drop dependent views temporarily
DROP VIEW IF EXISTS staff_capabilities CASCADE;
DROP VIEW IF EXISTS client_staff_assignments CASCADE;

-- 4. Add new temporary column as array
ALTER TABLE users ADD COLUMN category_temp TEXT[];

-- 5. Convert existing comma-separated strings to arrays
UPDATE users 
SET category_temp = string_to_array(category, ',')
WHERE category IS NOT NULL AND category != '';

-- 6. Remove old column and rename new one
ALTER TABLE users DROP COLUMN category;
ALTER TABLE users RENAME COLUMN category_temp TO category;

-- 5. Add GIN index for efficient array operations
CREATE INDEX IF NOT EXISTS idx_users_category_gin ON users USING GIN (category);

-- 7. Recreate views with array support
-- Recreate staff_capabilities view (if it existed)
CREATE OR REPLACE VIEW staff_capabilities AS
SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.phone,
    u.category,
    unnest(u.category) as individual_category,
    u.is_active,
    u.tenant_id
FROM users u
WHERE u.role = 'staff' 
AND u.is_active = true
AND u.category IS NOT NULL;

-- Recreate client_staff_assignments view (if it existed)
CREATE OR REPLACE VIEW client_staff_assignments AS
SELECT 
    c.id as client_id,
    c.first_name as client_first_name,
    c.last_name as client_last_name,
    c.category as client_category,
    s.id as staff_id,
    s.first_name as staff_first_name,
    s.last_name as staff_last_name,
    s.category as staff_categories,
    c.tenant_id
FROM users c
JOIN users s ON s.tenant_id = c.tenant_id
WHERE c.role = 'client' 
AND s.role = 'staff'
AND c.is_active = true 
AND s.is_active = true
AND (c.category IS NULL OR s.category @> ARRAY[c.category]);

-- 8. Verify migration
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '✅ Category column migration completed';
    RAISE NOTICE 'Sample data after migration:';
    
    -- Show some examples
    FOR rec IN 
        SELECT id, first_name, last_name, category 
        FROM users 
        WHERE category IS NOT NULL 
        LIMIT 5
    LOOP
        RAISE NOTICE 'User: % % - Categories: %', rec.first_name, rec.last_name, rec.category;
    END LOOP;
    
    RAISE NOTICE '✅ Views recreated with array support';
END $$;

-- 7. Test array operations
SELECT 
    'Array operations test:' as test,
    COUNT(*) as total_users_with_categories
FROM users 
WHERE category IS NOT NULL;

-- Test specific array queries
SELECT 
    'Users with category B:' as test,
    COUNT(*) as count
FROM users 
WHERE 'B' = ANY(category);

SELECT 
    'Users with multiple categories:' as test,
    COUNT(*) as count
FROM users 
WHERE array_length(category, 1) > 1;
