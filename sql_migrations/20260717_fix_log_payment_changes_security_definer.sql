-- Fix: log_payment_changes() trigger function was missing SECURITY DEFINER.
--
-- payment_audit_logs only allows INSERT for the service_role (by design - audit logs must
-- not be forgeable by regular users). The trigger inserting into payment_audit_logs must
-- therefore run with elevated privileges, just like the sibling trigger function
-- create_cash_transaction_from_payment() already does.
--
-- Without SECURITY DEFINER, any direct client-side update to the "payments" table (subject
-- to RLS as the authenticated user, e.g. via supabase-js from the browser) failed with:
--   "new row violates row-level security policy for table \"payment_audit_logs\""
-- even though the user was otherwise allowed to update the payments row itself.

CREATE OR REPLACE FUNCTION public.log_payment_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
      CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.id END,
      TG_OP,
      v_old_status,
      v_new_status,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.total_amount_rappen ELSE NULL END,
      CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.total_amount_rappen END,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.payment_method ELSE NULL END,
      CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.payment_method END,
      CASE WHEN TG_OP = 'DELETE' THEN NULL WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
      CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END
    );
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$;
