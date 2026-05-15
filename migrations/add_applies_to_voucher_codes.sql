-- Add applies_to to voucher_codes table
-- Controls which payment types the discount code can be applied to
-- Default: 'appointments' (discount codes are restricted to lesson bookings by default)
ALTER TABLE voucher_codes
  ADD COLUMN IF NOT EXISTS applies_to TEXT NOT NULL DEFAULT 'appointments'
    CHECK (applies_to IN ('all', 'appointments', 'products'));

COMMENT ON COLUMN voucher_codes.applies_to IS
  'Controls which payment types this code can be applied to.
   appointments = only lesson/course bookings (default)
   products     = only shop/product purchases
   all          = unrestricted';
