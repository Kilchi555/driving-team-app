-- Fix foreign key constraint to allow null company_billing_address_id in payments table
-- Issue: Foreign key constraint is too strict and doesn't allow null values

-- Drop ALL existing foreign key constraints for this column
ALTER TABLE payments 
DROP CONSTRAINT IF EXISTS "payments_company_billing_address_id_fkey1";

ALTER TABLE payments 
DROP CONSTRAINT IF EXISTS "payments_company_billing_address_id_fkey";

-- Recreate the foreign key constraint that allows null values
-- A null value in company_billing_address_id will not trigger the FK check
ALTER TABLE payments
ADD CONSTRAINT "payments_company_billing_address_id_fkey_nullable"
FOREIGN KEY (company_billing_address_id)
REFERENCES company_billing_addresses(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Verify the constraint was created
-- SELECT constraint_name, table_name, column_name
-- FROM information_schema.key_column_usage
-- WHERE table_name = 'payments' AND column_name = 'company_billing_address_id';

