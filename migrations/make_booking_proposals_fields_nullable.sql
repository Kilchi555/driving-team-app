-- Migration: Make booking_proposals fields nullable for general inquiries
-- category_code, duration_minutes, location_id, staff_id were NOT NULL
-- but general inquiries don't have these values

ALTER TABLE booking_proposals ALTER COLUMN category_code DROP NOT NULL;
ALTER TABLE booking_proposals ALTER COLUMN duration_minutes DROP NOT NULL;
ALTER TABLE booking_proposals ALTER COLUMN location_id DROP NOT NULL;
ALTER TABLE booking_proposals ALTER COLUMN staff_id DROP NOT NULL;
