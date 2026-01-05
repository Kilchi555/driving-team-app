# Payment API Security Layers Test

## Overview

This document describes how to test all 10 security layers of the `/api/payments/process` endpoint.

## Prerequisites

1. Dev server running: `npm run dev`
2. Have access to:
   - A valid Bearer token (get from app after login)
   - A valid `users.id` (not auth_user_id)
   - A valid `payments.id` for an existing pending payment
   - A valid `tenant_id`

## Testing All Layers

### Layer 1: Authentication ✅
Test that unauthenticated requests are rejected.

```bash
curl -X POST http://localhost:3000/api/payments/process \
  -H "Content-Type: application/json" \
  -d '{"paymentId": "test-id"}'
```

**Expected Response:** `401 Authentication required`

---

### Layer 2: Rate Limiting ✅
Test that rapid requests are rate limited.

```bash
# Run this 21 times in quick succession
for i in {1..21}; do
  curl -X POST http://localhost:3000/api/payments/process \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"paymentId": "invalid-id"}' &
done
wait
```

**Expected:** First 20 requests processed, 21st onwards return `429 Too many requests`

---

### Layer 3: Input Reading ✅
Test that invalid JSON is handled.

```bash
curl -X POST http://localhost:3000/api/payments/process \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d 'INVALID JSON'
```

**Expected:** `400 Invalid request body`

---

### Layer 4: Input Validation ✅
Test that invalid UUIDs are rejected.

```bash
curl -X POST http://localhost:3000/api/payments/process \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "not-a-uuid"
  }'
```

**Expected:** `400 Validierungsfehler: paymentId: Valid payment ID required`

---

### Layer 5: Tenant Extraction ✅
Test that tenant is correctly extracted from authenticated user (non-testable directly, validated in Layer 6).

---

### Layer 6: Payment Loading & Authorization ✅
Test that payments can only be accessed if they belong to the authenticated user's tenant.

```bash
# Get a payment ID for your user
# Then test:
curl -X POST http://localhost:3000/api/payments/process \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "9bcc9893-79ad-4109-8480-94cd82f5eb37"
  }'
```

**Expected:** 
- If payment belongs to user: Continue to Layer 9
- If payment doesn't exist: `404 Payment not found`
- If user doesn't own it: `403 Unauthorized`

---

### Layer 7: Payment Status Validation ✅
Test that only pending payments can be processed.

```bash
# Use a payment with status != 'pending'
# Expected: `400 Payment must be pending to process (current: completed)`
```

---

### Layer 8: Wallee Transaction Creation ✅
Test that valid payments successfully create Wallee transactions.

```bash
curl -X POST http://localhost:3000/api/payments/process \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "9bcc9893-79ad-4109-8480-94cd82f5eb37",
    "orderId": "TEST-ORDER-001",
    "successUrl": "http://localhost:3000/success",
    "failedUrl": "http://localhost:3000/failed"
  }'
```

**Expected:** 
```json
{
  "success": true,
  "paymentId": "9bcc9893-79ad-4109-8480-94cd82f5eb37",
  "transactionId": 462447421,
  "paymentUrl": "https://app-wallee.com/s/88489/payment/...",
  "paymentStatus": "pending",
  "message": "Payment processed successfully..."
}
```

---

### Layer 9: Payment URL Generation ✅
Test that the payment URL is correctly generated and returned.

Check the `paymentUrl` in the response from Layer 8:
- Should start with: `https://app-wallee.com/s/{spaceId}/payment/transaction/pay/`
- Should include: `securityToken=`

---

### Layer 10: Audit Logging ✅
Test that actions are logged to the audit table.

```sql
-- Check audit logs for the payment action
SELECT * FROM audit_logs 
WHERE action = 'process_payment' 
ORDER BY created_at DESC 
LIMIT 5;
```

**Expected:** 
- Entry with `status: 'success'`
- Contains transaction ID in details
- Timestamp recent

---

## Complete Test Workflow

### Step 1: Login & Get Token
1. Go to http://localhost:3000
2. Login with test account
3. Open DevTools Console → Application → Copy auth token

### Step 2: Get Payment Data
1. Go to http://localhost:3000/customer/payments
2. Find a pending payment
3. Right-click → Inspect → Check payment ID in DOM or Network tab

### Step 3: Test the API
```bash
export TOKEN="your-bearer-token"
export PAYMENT_ID="payment-uuid-from-step-2"

# Test the complete flow
curl -X POST http://localhost:3000/api/payments/process \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"paymentId\": \"$PAYMENT_ID\"
  }"
```

### Step 4: Verify Success
1. Check console response for success
2. Check audit_logs table for the entry
3. Payment record should have `wallee_transaction_id` set

---

## Security Layers Summary

| Layer | Test | Status |
|-------|------|--------|
| 1. Authentication | No token → 401 | ✅ |
| 2. Rate Limiting | 21+ requests → 429 | ✅ |
| 3. Input Reading | Invalid JSON → 400 | ✅ |
| 4. Input Validation | Invalid UUID → 400 | ✅ |
| 5. Tenant Extraction | Auto from auth | ✅ |
| 6. Authorization | Wrong tenant → 403 | ✅ |
| 7. Payment Status | Non-pending → 400 | ✅ |
| 8. Wallee Transaction | Valid → success | ✅ |
| 9. Payment URL | Correct format | ✅ |
| 10. Audit Logging | Entry created | ✅ |

---

## Expected Results

When all layers work correctly, you should see:

1. **Console Logs (Server):**
```
💳 Unified Payment Processing API called
📊 Rate limit check for process_payment...
✅ Wallee transaction created: { transactionId: 462447421, state: 'PENDING' }
✅ Payment page URL retrieved from service: https://app-wallee.com/s/88489/payment/...
✅ Payment processed successfully
```

2. **Database Changes:**
- `payments` table: `wallee_transaction_id` updated
- `audit_logs` table: New entry with action: `process_payment`

3. **Frontend Result:**
- Redirect to Wallee payment page
- OR toast notification with success/error message

---

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Authentication required` | No/invalid token | Get new token from app |
| `400 Valid payment ID required` | Invalid UUID format | Use correct UUID from database |
| `404 Payment not found` | Payment doesn't exist | Check payment ID in DB |
| `403 Unauthorized` | Payment in different tenant | Use payment from your tenant |
| `400 Payment must be pending` | Payment already processed | Use a pending payment |
| `500 Failed to create Wallee transaction` | Wallee API issue | Check Wallee credentials |


