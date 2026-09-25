-- Defense in depth for staff working-hour exceptions.
-- The RPC already rejects past civil dates. This trigger also rejects
-- authenticated Data API INSERT/UPDATE, and service-role writes.
-- A CHECK constraint cannot call now() or timezone().
-- The boundary is the Europe/Zurich civil date, not the UTC date.

CREATE OR REPLACE FUNCTION public.enforce_staff_working_hour_exception_not_past()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_today date := (timezone('Europe/Zurich', now()))::date;
BEGIN
  IF NEW.exception_date < v_today THEN
    RAISE EXCEPTION 'date_in_past';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_staff_working_hour_exception_not_past
  ON public.staff_working_hour_exceptions;

CREATE TRIGGER trg_staff_working_hour_exception_not_past
  BEFORE INSERT OR UPDATE
  ON public.staff_working_hour_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_staff_working_hour_exception_not_past();
