-- Fix: Create missing payments for appointments created on 2026-01-05
-- These appointments were created before payment creation logic was fixed

INSERT INTO public.payments (
  appointment_id,
  user_id,
  tenant_id,
  total_amount_rappen,
  payment_method,
  payment_status,
  description,
  created_at
)
SELECT
  a.id as appointment_id,
  a.user_id,
  a.tenant_id,
  -- Calculate amount based on appointment type
  CASE
    WHEN a.type = 'B' THEN 9500      -- CHF 95.00
    WHEN a.type = 'BE' THEN 12000    -- CHF 120.00
    ELSE 9500                        -- Default CHF 95.00
  END as total_amount_rappen,
  'wallee' as payment_method,
  'pending_confirmation' as payment_status,
  a.title as description,
  a.created_at
FROM public.appointments a
LEFT JOIN public.payments p ON a.id = p.appointment_id
WHERE p.id IS NULL  -- No payment exists
  AND a.created_at::date = '2026-01-05'  -- Only today's appointments
  AND a.status IN ('pending_confirmation', 'confirmed');

-- Verify creation
SELECT 
  COUNT(*) as payments_created,
  COUNT(DISTINCT appointment_id) as appointments_covered
FROM public.payments p
WHERE p.appointment_id IN (
  SELECT id FROM public.appointments 
  WHERE created_at::date = '2026-01-05'
);