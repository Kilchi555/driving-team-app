-- Stores discount codes that a user has registered once (sticky/auto-apply codes)
-- These are applied automatically to every future booking (online or via staff)
CREATE TABLE IF NOT EXISTS user_discount_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  code text NOT NULL,
  discount_id uuid REFERENCES discounts(id) ON DELETE SET NULL,
  registered_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz, -- null = follow discount's valid_until; set explicitly for fixed-term codes
  is_active boolean DEFAULT true NOT NULL,
  UNIQUE(user_id, tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_user_discount_codes_user_id ON user_discount_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_discount_codes_tenant_id ON user_discount_codes(tenant_id);

COMMENT ON TABLE user_discount_codes IS 'Discount codes registered once by a user; auto-applied to all future bookings';
COMMENT ON COLUMN user_discount_codes.expires_at IS 'Overrides discount valid_until; null = inherit from discount';
