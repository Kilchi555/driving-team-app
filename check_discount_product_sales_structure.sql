-- Check structure of discount_sales and product_sales tables
-- To understand correct column names for RLS policies

-- ============================================
-- 1. Check discount_sales structure
-- ============================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'discount_sales'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================
-- 2. Check product_sales structure
-- ============================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'product_sales'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================
-- 3. Check foreign keys to understand relationships
-- ============================================
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('discount_sales', 'product_sales')
ORDER BY tc.table_name;

