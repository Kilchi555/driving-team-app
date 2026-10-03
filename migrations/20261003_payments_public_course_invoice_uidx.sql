-- One public course-invoice payment per tenant and course registration.
-- Not applied by this change. Do not run against production from the app deploy.
--
-- Read-only check before writing this file (Driving Team App, 2026-10-03):
--   payments with course_registration_id = 117
--   registrations with more than one such payment = 0
--   those payments with tenant_id null = 0
--   staff_product_sale payments that also have course_registration_id = 0
--
-- The predicate is only the public course-invoice insert
-- (metadata.public_course_invoice = true). Wallee, admin enrollment,
-- company-invoice payments, SARI links, and staff_product_sale stay outside it.

CREATE UNIQUE INDEX IF NOT EXISTS payments_public_course_invoice_registration_uidx
  ON public.payments (tenant_id, course_registration_id)
  WHERE course_registration_id IS NOT NULL
    AND tenant_id IS NOT NULL
    AND (metadata ->> 'public_course_invoice') = 'true';
