-- Migration: Refactor product_sales to be independent from discount_sales
-- This allows products and discounts to be managed independently per appointment
-- Before: product_sales.product_sale_id -> discount_sales.id
-- After: product_sales.appointment_id -> appointments.id (direct relationship)

BEGIN;

-- Step 1: Create new appointment_id column in product_sales
ALTER TABLE public.product_sales 
ADD COLUMN appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE;

-- Step 2: Migrate data - get appointment_id from discount_sales
UPDATE public.product_sales ps
SET appointment_id = (
  SELECT ds.appointment_id 
  FROM public.discount_sales ds 
  WHERE ds.id = ps.product_sale_id
)
WHERE ps.product_sale_id IS NOT NULL;

-- Step 3: Make appointment_id NOT NULL (after data migration)
ALTER TABLE public.product_sales 
ALTER COLUMN appointment_id SET NOT NULL;

-- Step 4: Drop old foreign key constraint (product_sale_id)
ALTER TABLE public.product_sales 
DROP CONSTRAINT IF EXISTS product_sales_product_sale_id_fkey;

-- Step 5: Drop old product_sale_id column (no longer needed)
ALTER TABLE public.product_sales 
DROP COLUMN IF EXISTS product_sale_id CASCADE;

-- Step 6: Create index on appointment_id for performance
CREATE INDEX IF NOT EXISTS idx_product_sales_appointment_id 
ON public.product_sales(appointment_id);

-- Step 7: Update RLS policies if needed (product_sales should now filter by appointment owner)
-- Products are now directly tied to appointments, making RLS clearer

COMMIT;

