-- Migration: Allow NULL user_id in audit_logs
-- Problem: FK constraint prevents logging actions for deleted/non-existent users
-- Solution: Make user_id nullable and set ON DELETE SET NULL

ALTER TABLE audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

ALTER TABLE audit_logs
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE audit_logs
ADD CONSTRAINT audit_logs_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
