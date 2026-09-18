-- Additive: optional payment-method override on course categories.
-- NULL = inherit the tenant default (tenant_settings.payment.payment_settings.default_payment_method).
-- Reuses the same TEXT + CHECK vocabulary as courses.payment_method.
-- No data rewrite: existing courses.payment_method values are left untouched.
-- Rollback: ALTER TABLE public.course_categories DROP COLUMN IF EXISTS payment_method;

ALTER TABLE public.course_categories
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

ALTER TABLE public.course_categories
  DROP CONSTRAINT IF EXISTS course_categories_payment_method_check;

ALTER TABLE public.course_categories
  ADD CONSTRAINT course_categories_payment_method_check
  CHECK (
    payment_method IS NULL
    OR payment_method IN ('WALLEE', 'CASH_ON_SITE', 'INVOICE')
  );

COMMENT ON COLUMN public.course_categories.payment_method IS
  'Optional category override for course enrollment payment method. NULL = inherit tenant default. WALLEE / CASH_ON_SITE / INVOICE = explicit override.';
