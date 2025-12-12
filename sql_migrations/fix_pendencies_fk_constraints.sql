-- Fix foreign key constraints for pendencies table
-- Issue: FK constraints are too strict and block inserts even with service role

-- Drop existing FK constraints for assigned_to and created_by
ALTER TABLE pendencies
DROP CONSTRAINT IF EXISTS "pendencies_assigned_to_fkey";

ALTER TABLE pendencies
DROP CONSTRAINT IF EXISTS "pendencies_created_by_fkey";

-- Recreate with DEFERRABLE INITIALLY DEFERRED to allow null values and defer validation
ALTER TABLE pendencies
ADD CONSTRAINT "pendencies_assigned_to_fkey"
FOREIGN KEY (assigned_to)
REFERENCES users(id)
ON DELETE SET NULL
ON UPDATE CASCADE
DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE pendencies
ADD CONSTRAINT "pendencies_created_by_fkey"
FOREIGN KEY (created_by)
REFERENCES users(id)
ON DELETE SET NULL
ON UPDATE CASCADE
DEFERRABLE INITIALLY DEFERRED;

