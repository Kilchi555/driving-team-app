-- Check if payment_items exist for pending confirmation appointments
-- Created: 2025-11-12

-- Step 1: Find pending confirmation appointments
SELECT 
  a.id as appointment_id,
  a.start_time,
  a.status,
  p.id as payment_id,
  p.total_amount_rappen / 100.0 as total_chf
FROM appointments a
LEFT JOIN payments p ON p.appointment_id = a.id
WHERE a.status = 'pending_confirmation'
  AND a.deleted_at IS NULL
ORDER BY a.start_time ASC
LIMIT 10;

-- Step 2: Check payment_items for these payments
SELECT 
  pi.id,
  pi.payment_id,
  pi.item_type,
  pi.item_name,
  pi.quantity,
  pi.unit_price_rappen / 100.0 as unit_price_chf,
  pi.total_price_rappen / 100.0 as total_price_chf,
  pi.description,
  p.appointment_id,
  a.start_time
FROM payment_items pi
JOIN payments p ON p.id = pi.payment_id
JOIN appointments a ON a.id = p.appointment_id
WHERE a.status = 'pending_confirmation'
  AND a.deleted_at IS NULL
ORDER BY a.start_time ASC, pi.created_at ASC;

-- Step 3: Check if there are ANY payment_items at all
SELECT 
  COUNT(*) as total_payment_items,
  COUNT(DISTINCT payment_id) as payments_with_items
FROM payment_items;

-- Step 4: Show sample payment_items structure
SELECT 
  pi.*,
  p.appointment_id,
  p.total_amount_rappen / 100.0 as payment_total_chf
FROM payment_items pi
JOIN payments p ON p.id = pi.payment_id
ORDER BY pi.created_at DESC
LIMIT 10;

-- Step 5: Find payments WITHOUT items
SELECT 
  p.id as payment_id,
  p.appointment_id,
  p.total_amount_rappen / 100.0 as total_chf,
  p.payment_status,
  a.start_time,
  a.status as appointment_status
FROM payments p
LEFT JOIN payment_items pi ON pi.payment_id = p.id
LEFT JOIN appointments a ON a.id = p.appointment_id
WHERE pi.id IS NULL
  AND p.appointment_id IS NOT NULL
  AND a.status = 'pending_confirmation'
ORDER BY p.created_at DESC
LIMIT 10;

