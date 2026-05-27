-- Allow admins to override the auto-detected payment method per course.
-- NULL means: fall back to automatic detection based on course.city +
-- tenant.wallee_enabled (see utils/courseLocationUtils.ts:determinePaymentMethod).
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS payment_method TEXT
    CHECK (payment_method IN ('WALLEE', 'CASH_ON_SITE'));

COMMENT ON COLUMN public.courses.payment_method IS
  'Optional per-course override for the enrollment payment method. NULL = automatic detection (Einsiedeln → CASH_ON_SITE, others → WALLEE if tenant.wallee_enabled else CASH_ON_SITE).';
