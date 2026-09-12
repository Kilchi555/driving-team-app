# Wallee Payment Recovery System

## Problem
Payments were stuck in `pending` status even though Wallee had processed them as `FULFILL` (completed). This happened because:

1. **Webhook may not arrive**: Wallee webhooks sometimes don't reach the server
2. **No webhook logs**: We couldn't see if webhooks were being received
3. **No fallback mechanism**: Once pending, payments stayed pending forever

## Solution

### 1. Webhook Logging (`webhook_logs` table)
Every webhook now logs to the `webhook_logs` table with:
- `transaction_id`: Wallee transaction ID
- `payment_id`: Our payment ID (if found)
- `wallee_state`: State from Wallee
- `payment_status_before` / `payment_status_after`: Status change
- `success`: Whether processing succeeded
- `error_message`: Any errors encountered
- `raw_payload`: Full webhook data for debugging
- `processing_duration_ms`: How long it took

### 2. Debug Endpoints

#### `/api/debug/webhook-logs` (GET)
View all webhook logs with filtering:
```bash
# All logs
curl -H "Authorization: Bearer $TOKEN" https://simy.ch/api/debug/webhook-logs

# Filter by transaction ID
curl -H "Authorization: Bearer $TOKEN" \
  "https://simy.ch/api/debug/webhook-logs?transactionId=471822192"

# Filter by payment ID
curl -H "Authorization: Bearer $TOKEN" \
  "https://simy.ch/api/debug/webhook-logs?paymentId=80295e18-f6bb-4d83-b763-d8e296e18e91"

# Only failed webhooks
curl -H "Authorization: Bearer $TOKEN" \
  "https://simy.ch/api/debug/webhook-logs?success=false"
```

#### `/api/debug/pending-wallee-payments` (GET)
Find payments stuck in pending status:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://simy.ch/api/debug/pending-wallee-payments
```

Shows:
- Which pending payments have webhook logs vs don't
- If webhook was successful or failed
- How long each has been pending

### 3. Recovery Cron (`/api/cron/recover-pending-wallee-payments`)
Automatically recovers stuck payments by:
- Finding all pending payments older than 5 minutes
- Querying Wallee API for actual transaction status
- Updating DB if status changed
- Creating recovery log entries

**Setup:** Add to your cron service to run every 10 minutes:
```
POST https://simy.ch/api/cron/recover-pending-wallee-payments
Header: x-cron-secret: $CRON_SECRET
```

## SQL Queries for Manual Investigation

### Check payments for specific user
```sql
SELECT 
  id,
  payment_status,
  wallee_transaction_id,
  created_at,
  updated_at,
  paid_at
FROM payments
WHERE user_id = 'USER_ID'
ORDER BY created_at DESC;
```

### Find all pending payments with transaction IDs
```sql
SELECT 
  id,
  user_id,
  total_amount_rappen / 100 as amount_chf,
  wallee_transaction_id,
  created_at,
  updated_at,
  EXTRACT(MINUTE FROM NOW() - updated_at) as minutes_pending
FROM payments
WHERE payment_status = 'pending'
  AND payment_method = 'wallee'
  AND wallee_transaction_id IS NOT NULL
ORDER BY updated_at ASC;
```

### Check webhook logs for transaction
```sql
SELECT 
  transaction_id,
  payment_id,
  wallee_state,
  payment_status_before,
  payment_status_after,
  success,
  error_message,
  created_at
FROM webhook_logs
WHERE transaction_id = 'TRANSACTION_ID'
ORDER BY created_at DESC;
```

### Find payments where webhook failed
```sql
SELECT 
  p.id as payment_id,
  p.wallee_transaction_id,
  p.payment_status,
  w.success,
  w.error_message,
  w.created_at as webhook_log_time
FROM payments p
LEFT JOIN webhook_logs w ON p.wallee_transaction_id = w.transaction_id
WHERE p.payment_status = 'pending'
  AND p.payment_method = 'wallee'
  AND p.wallee_transaction_id IS NOT NULL
  AND (w.success = false OR w.error_message IS NOT NULL)
ORDER BY w.created_at DESC;
```

## Manual Recovery

If a payment is stuck and recovery cron isn't running:

1. **Check webhook logs:**
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     "https://simy.ch/api/debug/webhook-logs?transactionId=TRANSACTION_ID"
   ```

2. **Check payment status:**
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     "https://simy.ch/api/debug/pending-wallee-payments"
   ```

3. **Manual fix (SQL):**
   ```sql
   UPDATE payments
   SET 
     payment_status = 'completed',
     paid_at = NOW(),
     updated_at = NOW()
   WHERE id = 'PAYMENT_ID'
     AND payment_status = 'pending';
   ```

## Testing

### Simulate payment completion
```sql
-- Create test payment
INSERT INTO payments (
  id, user_id, tenant_id, payment_status, payment_method,
  wallee_transaction_id, total_amount_rappen, description,
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'USER_ID',
  'TENANT_ID',
  'pending',
  'wallee',
  '999999999',
  9500,
  'Test payment',
  NOW() - interval '10 minutes',
  NOW() - interval '10 minutes'
)
RETURNING id;

-- Then run recovery cron - it should update this payment
```

## Environment Variables

```env
CRON_SECRET=your-secret-key  # Required for cron endpoint auth
```

## Performance Impact

- **Webhook logging**: ~50ms extra per webhook
- **Cron job**: ~2-5 seconds for 100 pending payments (with Wallee API calls)
- **Storage**: ~1KB per webhook log entry

Run cron job every 10 minutes to stay current.

---

## Processing lock & sync-then-release (double-charge guard)

**When to use:** Customer stuck on "Zahlung läuft" / `processing`, "Jetzt bezahlen" reappears while Wallee still has an open Confirmed checkout, or suspected double charge after abort.

### Intent

Checkout sets `payments.payment_status = 'processing'` as an **optimistic lock** before/while redirecting to Wallee. Historically, abort handlers **blindly** set `processing → pending`, which re-enabled a new charge while the first Wallee transaction (often `CONFIRMED`) could still `FULFILL`.

**Rule:** never release to `pending` without reading Wallee first. Shared helpers live in `server/utils/wallee-payment-sync.ts`.

### Wallee state → decision

| Wallee state | Decision | DB effect |
|--------------|----------|-----------|
| `FULFILL` / `COMPLETED` / `SUCCESSFUL` | `mark_completed` | → `completed` (+ `paid_at`) |
| `AUTHORIZED` | `mark_authorized` | → `authorized` |
| `FAILED` / `CANCELED` / `DECLINE` / `VOIDED` | `release_pending` | `processing`/`failed` → `pending` |
| `PENDING` / `CONFIRMED` / `PROCESSING` | `keep_open` | **no status change**; resume URL may be returned |
| API error / unknown | `unknown` | **keep lock** (safe default) |
| No `wallee_transaction_id` | `no_transaction` | allow release `processing` → `pending` |

`CONFIRMED` maps to our `processing` in `WALLEE_STATUS_MAPPING` — treat as still open, not failed.

### Client / UI surfaces

| Surface | Behavior |
|---------|----------|
| `POST /api/payments/release-processing-lock` | Own-tenant `processing` rows; `action: 'sync'` (default) or `'abandon'` |
| `POST /api/payments/status` (non-privileged) | Client cannot force `completed`/`authorized`; abort statuses run `syncAndResolvePayment` only |
| `/payment/failed`, customer payments, dashboard | Call release-lock / status after abort |
| Webhook `wallee/webhook.post.ts` | Terminal failure on `processing` → release to `pending` |
| Cron recover Phase 2 | Stuck `processing` older than **10 minutes** (created_at + updated_at); same keep-open for in-flight states |

### `abandon` vs resume

`abandonOrResumePayment`:

1. Sync first (may already be paid / releasable).
2. Only **`AUTHORIZED`** is voided (`TransactionVoidService.voidOnline`), then released.
3. Still-open **`CONFIRMED`/`PENDING`/`PROCESSING`** → return **resume payment URL**; do **not** create a parallel transaction.

Audit action when something changes: `payment_processing_lock_synced`.

### Ops pitfalls

1. **Do not SQL-force `processing → pending`** while Wallee shows `CONFIRMED` — that recreates the double-charge window. Prefer resume URL or wait for terminal state / cron.
2. Cron Phase 2 **keeps** the lock when Wallee is still open; only terminal failure or success updates the row.
3. If sync API errors (`unknown`), the lock stays — customer may need ops to inspect Wallee + `webhook_logs`, then act.
4. Creating a second Wallee transaction while one is open is the failure mode this path prevents; process flows should reuse/resume open txs.

### Codepaths (lock)

- `server/utils/wallee-payment-sync.ts` — `syncAndResolvePayment`, `abandonOrResumePayment`, `readWalleeTransactionState`
- `server/api/payments/release-processing-lock.post.ts`
- `server/api/payments/status.post.ts` (client abort branch)
- `server/api/cron/recover-pending-wallee-payments.get.ts` (Phase 2)
- `server/api/wallee/webhook.post.ts` (processing lock release on terminal failure)
- `pages/payment/failed.vue`, `pages/customer/payments.vue`, `components/customer/CustomerDashboard.vue`
