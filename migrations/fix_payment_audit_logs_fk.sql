/**
 * Migration: Fix payment_audit_logs foreign key constraint
 * 
 * Problem: The log_payment_changes() trigger tries to insert into payment_audit_logs
 * with the deleted payment_id, but the FK constraint blocks it.
 * 
 * Solution: Change FK constraint to ON DELETE SET NULL so audit logs survive payment deletion
 */

-- Drop the problematic constraint
ALTER TABLE payment_audit_logs 
DROP CONSTRAINT payment_audit_logs_payment_id_fkey;

-- Add it back with ON DELETE SET NULL
-- This allows payment_id to become NULL when payment is deleted
ALTER TABLE payment_audit_logs 
ADD CONSTRAINT payment_audit_logs_payment_id_fkey 
FOREIGN KEY (payment_id) 
REFERENCES payments(id) 
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Verify the change
SELECT constraint_name, table_name, column_name, foreign_table_name
FROM information_schema.key_column_usage
WHERE constraint_name = 'payment_audit_logs_payment_id_fkey';
