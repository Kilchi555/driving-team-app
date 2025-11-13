-- Backfill payment_items for existing payments without items
-- Created: 2025-11-12
-- Purpose: Create payment_items for payments that were created before the payment_items feature

-- ============================================
-- STEP 1: Check how many payments need items
-- ============================================
SELECT 
  COUNT(DISTINCT p.id) as payments_without_items
FROM payments p
LEFT JOIN payment_items pi ON pi.payment_id = p.id
WHERE pi.id IS NULL
  AND p.appointment_id IS NOT NULL;

-- ============================================
-- STEP 2: Create payment_items for payments without them
-- ============================================
-- This creates a "service" item for each payment based on total_amount_rappen

INSERT INTO payment_items (
  payment_id,
  item_type,
  item_name,
  quantity,
  unit_price_rappen,
  total_price_rappen,
  description,
  created_at
)
SELECT 
  p.id as payment_id,
  'service' as item_type,
  COALESCE(
    CASE 
      WHEN a.type ILIKE '%prüfung%' THEN 'Prüfung'
      WHEN a.type ILIKE '%theorie%' THEN 'Theorielektion'
      WHEN a.event_type_code = 'exam' THEN 'Prüfung'
      WHEN a.event_type_code = 'theory' THEN 'Theorielektion'
      ELSE 'Fahrlektion'
    END,
    'Fahrlektion'
  ) as item_name,
  1 as quantity,
  p.total_amount_rappen as unit_price_rappen,
  p.total_amount_rappen as total_price_rappen,
  CASE 
    WHEN a.duration_minutes IS NOT NULL 
    THEN a.duration_minutes || ' Minuten'
    ELSE '45 Minuten'
  END as description,
  p.created_at as created_at
FROM payments p
LEFT JOIN payment_items pi ON pi.payment_id = p.id
LEFT JOIN appointments a ON a.id = p.appointment_id
WHERE pi.id IS NULL
  AND p.appointment_id IS NOT NULL
  AND p.total_amount_rappen > 0;

-- ============================================
-- STEP 3: Verify results
-- ============================================
SELECT 
  'After backfill' as status,
  COUNT(*) as total_payment_items,
  COUNT(DISTINCT payment_id) as payments_with_items
FROM payment_items;

-- ============================================
-- STEP 4: Check your specific payment
-- ============================================
SELECT 
  pi.*,
  p.total_amount_rappen / 100.0 as payment_total_chf,
  a.start_time
FROM payment_items pi
JOIN payments p ON p.id = pi.payment_id
LEFT JOIN appointments a ON a.id = p.appointment_id
WHERE p.id = 'e602197d-4bb9-486c-ac8d-3c08b8af4d77'
ORDER BY pi.created_at ASC;

-- ============================================
-- STEP 5: Show all pending confirmations with items
-- ============================================
SELECT 
  a.id as appointment_id,
  a.start_time,
  a.status,
  p.id as payment_id,
  p.total_amount_rappen / 100.0 as total_chf,
  COUNT(pi.id) as item_count,
  STRING_AGG(pi.item_name || ' (CHF ' || (pi.total_price_rappen/100.0)::text || ')', ', ') as items
FROM appointments a
JOIN payments p ON p.appointment_id = a.id
LEFT JOIN payment_items pi ON pi.payment_id = p.id
WHERE a.status = 'pending_confirmation'
  AND a.deleted_at IS NULL
GROUP BY a.id, a.start_time, a.status, p.id, p.total_amount_rappen
ORDER BY a.start_time ASC;

