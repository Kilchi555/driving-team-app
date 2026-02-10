-- Migration: Fix log_payment_changes trigger
-- Problem: Trigger versucht payment_id zu inserieren beim DELETE, was FK-Violation verursacht
-- Solution: Skip DELETE operation in trigger

DROP TRIGGER IF EXISTS trigger_log_payment_changes ON payments CASCADE;
DROP FUNCTION IF EXISTS log_payment_changes() CASCADE;

CREATE OR REPLACE FUNCTION log_payment_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_old_status varchar;
  v_new_status varchar;
BEGIN
  v_old_status := CASE WHEN TG_OP = 'UPDATE' THEN OLD.payment_status ELSE NULL END;
  v_new_status := CASE WHEN TG_OP = 'UPDATE' THEN NEW.payment_status ELSE NULL END;

  IF TG_OP != 'DELETE' THEN
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
      NEW.id,
      TG_OP,
      v_old_status,
      v_new_status,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.total_amount_rappen ELSE NULL END,
      NEW.total_amount_rappen,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.payment_method ELSE NULL END,
      NEW.payment_method,
      CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
      row_to_json(NEW)
    );
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_payment_changes
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION log_payment_changes();
