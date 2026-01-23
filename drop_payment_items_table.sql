-- Drop payment_items table
-- WARNING: This will permanently delete the payment_items table and all associated data

-- Step 1: Drop RLS Policies
DROP POLICY IF EXISTS "payment_items_select_policy" ON public.payment_items;
DROP POLICY IF EXISTS "payment_items_insert_policy" ON public.payment_items;
DROP POLICY IF EXISTS "payment_items_update_policy" ON public.payment_items;
DROP POLICY IF EXISTS "payment_items_tenant_access" ON public.payment_items;

-- Step 2: Drop Indexes
DROP INDEX IF EXISTS idx_payment_items_payment_id;
DROP INDEX IF EXISTS idx_payment_items_item_type;
DROP INDEX IF EXISTS idx_payment_items_item_id;
DROP INDEX IF EXISTS idx_payment_items_tenant_id;

-- Step 3: Drop Foreign Key Constraints
ALTER TABLE IF EXISTS public.payment_items 
DROP CONSTRAINT IF EXISTS payment_items_payment_id_fkey;

ALTER TABLE IF EXISTS public.payment_items 
DROP CONSTRAINT IF EXISTS payment_items_tenant_id_fkey;

-- Step 4: Drop the table
DROP TABLE IF EXISTS public.payment_items CASCADE;

-- Verify deletion
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'payment_items'
) AS table_exists;

