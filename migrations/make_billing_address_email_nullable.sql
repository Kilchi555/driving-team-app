-- Make email nullable in company_billing_addresses
-- It's not always required for billing addresses
ALTER TABLE company_billing_addresses
  ALTER COLUMN email DROP NOT NULL;
