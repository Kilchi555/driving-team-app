-- Soft-Delete all payments for user 4d107e4e-b221-48f2-9be8-cdbf2cf2f8bc
-- This marks payments as deleted without removing data

UPDATE public.payments
SET 
  deleted_at = NOW(),
  updated_at = NOW()
WHERE user_id = '4d107e4e-b221-48f2-9be8-cdbf2cf2f8bc'
AND deleted_at IS NULL;

-- Verify the deletion
SELECT id, user_id, payment_status, total_amount_rappen, deleted_at
FROM public.payments
WHERE user_id = '4d107e4e-b221-48f2-9be8-cdbf2cf2f8bc'
ORDER BY created_at DESC;

