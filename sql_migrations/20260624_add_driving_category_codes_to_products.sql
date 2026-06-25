-- Migration: Add allowed_driving_category_codes to products
-- NULL means the product is shown for ALL driving categories (default behaviour).
-- When set, only the listed category codes will see this product in EventModal.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS allowed_driving_category_codes TEXT[] DEFAULT NULL;

COMMENT ON COLUMN products.allowed_driving_category_codes IS
  'Driving licence category codes (e.g. [''B'',''BE'']) for which this product is shown in the EventModal. NULL = shown for all categories.';
