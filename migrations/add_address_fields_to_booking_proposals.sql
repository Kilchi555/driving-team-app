-- migrations/add_address_fields_to_booking_proposals.sql

ALTER TABLE public.booking_proposals
ADD COLUMN street VARCHAR(255),
ADD COLUMN house_number VARCHAR(50),
ADD COLUMN postal_code VARCHAR(10),
ADD COLUMN city VARCHAR(255);

-- Update existing RLS policies to allow inserts with new columns
-- The existing anon_insert_booking_proposals policy should still apply
-- as it uses 'WITH CHECK (true)', but we can make it more explicit if needed.
-- For now, the schema change is sufficient.
