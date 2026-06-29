-- Allow 'wallee' and 'credit' as payment_method values in course_registrations
ALTER TABLE course_registrations DROP CONSTRAINT IF EXISTS course_registrations_payment_method_check;
ALTER TABLE course_registrations ADD CONSTRAINT course_registrations_payment_method_check
  CHECK (payment_method IN ('online', 'cash_on_site', 'invoice', 'wallee', 'credit'));
