-- Use tenant.invoice_due_days for automatic invoice due dates (fallback 30).
-- Previously hardcoded to +30 days regardless of admin Zahlungsfrist setting.

CREATE OR REPLACE FUNCTION set_invoice_due_date()
RETURNS TRIGGER AS $$
DECLARE
  due_days integer;
BEGIN
  IF NEW.due_date IS NULL THEN
    SELECT COALESCE(invoice_due_days, 30)
      INTO due_days
      FROM tenants
     WHERE id = NEW.tenant_id;

    IF due_days IS NULL OR due_days < 0 THEN
      due_days := 30;
    END IF;

    NEW.due_date := COALESCE(NEW.invoice_date, CURRENT_DATE) + (due_days || ' days')::INTERVAL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
