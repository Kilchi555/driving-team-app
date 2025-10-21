-- Check product_sales structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'product_sales' 
  AND table_schema = 'public';

-- Check if discount_sales exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'discount_sales' 
  AND table_schema = 'public';

-- Check cancellation_policies structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cancellation_policies' 
  AND table_schema = 'public';

-- Check cancellation_rules structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cancellation_rules' 
  AND table_schema = 'public';

-- Check payments structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payments' 
  AND table_schema = 'public';

