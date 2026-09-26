-- Past civil dates are immutable on staff_working_hour_exceptions.
-- INSERT and UPDATE already raise date_in_past. DELETE must do the same.
-- Today and later dates stay deletable so restore still works.
-- The cutoff is the Europe/Zurich civil date. A CHECK cannot call now().
-- The RPC check stays. This trigger is defense in depth for the Data API
-- and for service-role writes. It does not change intervals, RLS, or weekly hours.

CREATE OR REPLACE FUNCTION public.enforce_staff_working_hour_exception_not_past()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_today date := (timezone('Europe/Zurich', now()))::date;
  v_date date;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_date := OLD.exception_date;
  ELSE
    v_date := NEW.exception_date;
  END IF;

  IF v_date < v_today OR (TG_OP = 'UPDATE' AND OLD.exception_date < v_today) THEN
    RAISE EXCEPTION 'date_in_past';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_staff_working_hour_exception_not_past
  ON public.staff_working_hour_exceptions;

CREATE TRIGGER trg_staff_working_hour_exception_not_past
  BEFORE INSERT OR UPDATE OR DELETE
  ON public.staff_working_hour_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_staff_working_hour_exception_not_past();
