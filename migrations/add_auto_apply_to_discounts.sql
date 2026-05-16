-- Add auto_apply flag to discounts table
-- When true, the discount can be registered once by a user and will auto-apply to all future bookings
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS auto_apply boolean DEFAULT false;

COMMENT ON COLUMN discounts.auto_apply IS 'If true, customers can register this code once and it will be automatically applied to all future bookings';
