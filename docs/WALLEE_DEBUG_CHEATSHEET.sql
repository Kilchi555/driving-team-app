#!/bin/bash
# Wallee Payment Recovery - Quick Commands

# 1. CHECK PENDING PAYMENTS (SQL Query)
# =====================================
# Find all payments stuck in pending with Wallee transaction IDs

SELECT 
  id,
  user_id,
  (total_amount_rappen / 100)::numeric(10,2) as amount_chf,
  wallee_transaction_id,
  created_at,
  EXTRACT(MINUTE FROM NOW() - updated_at) as minutes_pending
FROM payments
WHERE payment_status = 'pending'
  AND payment_method = 'wallee'
  AND wallee_transaction_id IS NOT NULL
ORDER BY updated_at ASC;

# 2. CHECK WEBHOOK LOGS (SQL Query)
# ==================================
# See if webhooks arrived for specific transaction

SELECT 
  transaction_id,
  payment_id,
  wallee_state,
  payment_status_before,
  payment_status_after,
  success,
  error_message,
  processing_duration_ms,
  created_at
FROM webhook_logs
WHERE transaction_id = '471822192'  -- Replace with your transaction ID
ORDER BY created_at DESC;

# 3. FIND ALL FAILED WEBHOOKS (SQL Query)
# ========================================
# Webhooks that arrived but processing failed

SELECT 
  transaction_id,
  payment_id,
  wallee_state,
  error_message,
  created_at
FROM webhook_logs
WHERE success = false
ORDER BY created_at DESC
LIMIT 20;

# 4. DEBUG VIA API - Check Webhook Logs
# ======================================
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://simy.ch/api/debug/webhook-logs?limit=50"

# Filter by transaction ID
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://simy.ch/api/debug/webhook-logs?transactionId=471822192"

# Filter by payment ID
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://simy.ch/api/debug/webhook-logs?paymentId=80295e18-f6bb-4d83-b763-d8e296e18e91"

# Only failed webhooks
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://simy.ch/api/debug/webhook-logs?success=false"

# 5. DEBUG VIA API - Check Pending Payments
# ==========================================
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://simy.ch/api/debug/pending-wallee-payments"

# 6. MANUAL RECOVERY - Fix Single Payment
# ========================================
# Use this if cron isn't running

UPDATE payments
SET 
  payment_status = 'completed',
  paid_at = NOW(),
  updated_at = NOW()
WHERE id = '80295e18-f6bb-4d83-b763-d8e296e18e91'
  AND payment_status = 'pending';

# 7. TRIGGER RECOVERY CRON MANUALLY
# ==================================
# If running on Vercel/manual server

curl -X POST https://simy.ch/api/cron/recover-pending-wallee-payments \
  -H "x-cron-secret: YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"

# 8. COUNT STUCK PAYMENTS (SQL Query)
# ====================================
SELECT 
  COUNT(*) as total_pending,
  SUM(total_amount_rappen) / 100 as total_chf
FROM payments
WHERE payment_status = 'pending'
  AND payment_method = 'wallee'
  AND wallee_transaction_id IS NOT NULL;

# 9. FIND PAYMENTS WITH NO WEBHOOK LOG (SQL Query)
# =================================================
# These payments never received a webhook

SELECT 
  p.id,
  p.user_id,
  p.wallee_transaction_id,
  p.created_at,
  EXTRACT(MINUTE FROM NOW() - p.updated_at) as minutes_pending,
  'NO WEBHOOK' as status
FROM payments p
LEFT JOIN webhook_logs w ON p.wallee_transaction_id = w.transaction_id
WHERE p.payment_status = 'pending'
  AND p.payment_method = 'wallee'
  AND p.wallee_transaction_id IS NOT NULL
  AND w.id IS NULL
ORDER BY p.created_at ASC;

# 10. SUMMARY REPORT (SQL Query)
# ===============================
# Overall health of payments

SELECT 
  'Pending (Total)' as metric,
  COUNT(*) as count,
  SUM(total_amount_rappen) / 100 as amount_chf
FROM payments
WHERE payment_status = 'pending'
  AND payment_method = 'wallee'

UNION ALL

SELECT 
  'Pending (With Webhook)',
  COUNT(*),
  SUM(p.total_amount_rappen) / 100
FROM payments p
JOIN webhook_logs w ON p.wallee_transaction_id = w.transaction_id
WHERE p.payment_status = 'pending'
  AND p.payment_method = 'wallee'

UNION ALL

SELECT 
  'Completed Today',
  COUNT(*),
  SUM(total_amount_rappen) / 100
FROM payments
WHERE payment_status = 'completed'
  AND payment_method = 'wallee'
  AND DATE(created_at) = CURRENT_DATE;
