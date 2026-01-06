-- Hard delete all payments and appointments for user 89f9ae5d-5240-4ecc-80b3-ba10c78fcf73
-- Execute this in Supabase SQL Editor -> New Query

BEGIN;

-- Count before deletion
SELECT 
  (SELECT COUNT(*) FROM public.payments WHERE user_id = '89f9ae5d-5240-4ecc-80b3-ba10c78fcf73') as payments_to_delete,
  (SELECT COUNT(*) FROM public.appointments WHERE user_id = '89f9ae5d-5240-4ecc-80b3-ba10c78fcf73') as appointments_to_delete;

-- Hard delete all payments
DELETE FROM public.payments 
WHERE user_id = '89f9ae5d-5240-4ecc-80b3-ba10c78fcf73';

-- Hard delete all appointments
DELETE FROM public.appointments 
WHERE user_id = '89f9ae5d-5240-4ecc-80b3-ba10c78fcf73';

-- Verify deletion
SELECT 
  (SELECT COUNT(*) FROM public.payments WHERE user_id = '89f9ae5d-5240-4ecc-80b3-ba10c78fcf73') as remaining_payments,
  (SELECT COUNT(*) FROM public.appointments WHERE user_id = '89f9ae5d-5240-4ecc-80b3-ba10c78fcf73') as remaining_appointments;

COMMIT;

