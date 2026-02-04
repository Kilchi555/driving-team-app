-- Migration: Add payment_audit_logs table and trigger
-- Purpose: Track ALL changes to payments for debugging and compliance
-- Created: 2026-02-04

-- 1. Create payment_audit_logs table
CREATE TABLE IF NOT EXISTS payment_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  
  -- Change details
  operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by VARCHAR(255), -- User who made the change (if available)
  
  -- Before/After values for key fields
  old_payment_status VARCHAR(50),
  new_payment_status VARCHAR(50),
  old_total_amount_rappen INTEGER,
  new_total_amount_rappen INTEGER,
  old_payment_method VARCHAR(50),
  new_payment_method VARCHAR(50),
  
  -- Full before/after for detailed debugging
  old_values JSONB,
  new_values JSONB,
  
  -- Meta
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Context
  notes TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_payment_id ON payment_audit_logs(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_created_at ON payment_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_operation ON payment_audit_logs(operation);
CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_status_change ON payment_audit_logs(old_payment_status, new_payment_status);

-- 2. Create trigger function
CREATE OR REPLACE FUNCTION log_payment_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_old_status VARCHAR(50);
  v_new_status VARCHAR(50);
BEGIN
  -- Get old and new status
  v_old_status := CASE WHEN TG_OP = 'UPDATE' THEN OLD.payment_status ELSE NULL END;
  v_new_status := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.payment_status END;
  
  -- Only log if something actually changed
  IF TG_OP = 'UPDATE' AND 
     OLD.payment_status = NEW.payment_status AND
     OLD.total_amount_rappen = NEW.total_amount_rappen AND
     OLD.payment_method = NEW.payment_method THEN
    RETURN NEW;
  END IF;
  
  -- Log the change
  INSERT INTO payment_audit_logs (
    payment_id,
    operation,
    old_payment_status,
    new_payment_status,
    old_total_amount_rappen,
    new_total_amount_rappen,
    old_payment_method,
    new_payment_method,
    old_values,
    new_values
  ) VALUES (
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    TG_OP,
    v_old_status,
    v_new_status,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.total_amount_rappen ELSE NULL END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.total_amount_rappen END,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.payment_method ELSE NULL END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.payment_method END,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) 
         WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)
         ELSE NULL END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END
  );
  
  -- Return appropriate value
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger
DROP TRIGGER IF EXISTS trigger_log_payment_changes ON payments;
CREATE TRIGGER trigger_log_payment_changes
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION log_payment_changes();

-- 4. Enable RLS
ALTER TABLE payment_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow super_admin to read
CREATE POLICY "Allow super_admin read audit logs" ON payment_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

-- Allow service role to insert
CREATE POLICY "Allow service role insert audit logs" ON payment_audit_logs
  FOR INSERT
  WITH CHECK (true);

GRANT SELECT ON payment_audit_logs TO authenticated;
GRANT ALL ON payment_audit_logs TO service_role;

-- Add comments
COMMENT ON TABLE payment_audit_logs IS 'Complete audit trail of all payment changes - tracks who changed what and when';
COMMENT ON COLUMN payment_audit_logs.operation IS 'Type of operation: INSERT, UPDATE, or DELETE';
COMMENT ON COLUMN payment_audit_logs.old_payment_status IS 'Payment status before change';
COMMENT ON COLUMN payment_audit_logs.new_payment_status IS 'Payment status after change';

SELECT '✅ payment_audit_logs table and trigger created!' as status;
