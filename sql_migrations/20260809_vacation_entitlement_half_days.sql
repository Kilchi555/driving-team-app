-- Allow half-day vacation entitlements (e.g. pro-rata mid-year start: 11.5 days)
ALTER TABLE users
  ALTER COLUMN vacation_entitlement_days TYPE numeric(5,1)
  USING vacation_entitlement_days::numeric(5,1);

COMMENT ON COLUMN users.vacation_entitlement_days IS
  'Annual Ferien entitlement in days (supports half days for pro-rata)';
