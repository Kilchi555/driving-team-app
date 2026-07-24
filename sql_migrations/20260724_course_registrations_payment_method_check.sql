-- Allow admin enrollment payment methods used by the app
-- (Bereits bezahlt → admin, Platz reservieren → reserved, Firmenkurs → company)

ALTER TABLE public.course_registrations
  DROP CONSTRAINT IF EXISTS course_registrations_payment_method_check;

ALTER TABLE public.course_registrations
  ADD CONSTRAINT course_registrations_payment_method_check
  CHECK (
    payment_method IS NULL
    OR payment_method::text = ANY (ARRAY[
      'online'::text,
      'cash_on_site'::text,
      'invoice'::text,
      'wallee'::text,
      'credit'::text,
      'admin'::text,
      'reserved'::text,
      'company'::text
    ])
  );
