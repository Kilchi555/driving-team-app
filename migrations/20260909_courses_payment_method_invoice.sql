-- The admin course form offers Rechnung (INVOICE), but the original
-- courses.payment_method check only allowed WALLEE and CASH_ON_SITE.
-- Saving a course as invoice then failed with HTTP 500.
ALTER TABLE public.courses
  DROP CONSTRAINT IF EXISTS courses_payment_method_check;

ALTER TABLE public.courses
  ADD CONSTRAINT courses_payment_method_check
  CHECK (
    payment_method IS NULL
    OR payment_method IN ('WALLEE', 'CASH_ON_SITE', 'INVOICE')
  );

COMMENT ON COLUMN public.courses.payment_method IS
  'Optional per-course override for the enrollment payment method. NULL = automatic detection. INVOICE = Rechnung.';
