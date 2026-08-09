-- Admin default for online booking when staff is assigned.
-- Runtime gate remains staff_locations.is_online_bookable.
UPDATE locations
SET public_bookable = true
WHERE public_bookable IS NULL;

ALTER TABLE locations
  ALTER COLUMN public_bookable SET DEFAULT true;

COMMENT ON COLUMN locations.public_bookable IS
  'Admin default: when staff is assigned, seed staff_locations.is_online_bookable from this flag. Runtime gate is staff_locations.is_online_bookable.';
