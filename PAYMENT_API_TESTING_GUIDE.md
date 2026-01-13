# Payment API Testing Guide

## 🧪 Local Testing Strategy

### Part 1: cURL Tests (Terminal)

Run the automated test script:

```bash
chmod +x test-payment-apis.sh
./test-payment-apis.sh
```

**What it tests:**
- ✅ Create payment WITH valid auth
- ❌ Create payment WITHOUT auth (should fail)
- ❌ Create payment with INVALID token (should fail)
- ❌ Create payment with INVALID UUID (should fail)
- ✅ Confirm cash payment
- ✅ Reset failed payment

**Expected Results:**
```
TEST 1: Create Payment with Valid Auth ✅
  → Payment ID created successfully

TEST 2: Create Payment WITHOUT Auth ❌
  → "Authentication required" error

TEST 3: Create Payment with Invalid Token ❌
  → "Invalid authentication" error

TEST 4: Create Payment with Invalid UUID ❌
  → Validation error

TEST 5: Confirm Cash Payment ✅
  → Payment confirmed

TEST 6: Reset Failed Payment ✅
  → Payment reset to pending
```

---

### Part 2: Browser UI Tests

#### Setup:
1. Open your app at `http://localhost:3000`
2. Log in with your test account
3. Navigate to **Schülerliste** (Students page)

#### Test 1: Create Payment via UI
1. Click on a student
2. Look for payment creation option
3. Try to create a payment with method "cash"
4. **Expected:** Payment created, success toast appears, auto-hides after 3s

#### Test 2: Confirm Cash Payment
1. Go to payments list
2. Find a pending cash payment
3. Click "Bestätigen" (Confirm)
4. **Expected:** Payment status changes to "completed"

#### Test 3: Test Rate Limiting
1. Try to create 25+ payments in 60 seconds
2. **Expected:** After 20th request → "Too many requests" error (429)

#### Test 4: Test Tenant Isolation
*(This requires two browser sessions with different tenants)*
1. Log in as Admin (Tenant A)
2. Try to access payment from Tenant B's customer
3. **Expected:** "Unauthorized" error

#### Test 5: Test Authorization (Role-based)
*(Requires test account with different role)*
1. Log in as "Customer" (not staff)
2. Try to create payment via API/UI
3. **Expected:** "Only staff/admin can create payments" error

---

## 🔍 Security Checks to Verify

### Authentication Layer
```bash
# Should FAIL - no auth
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{"userId":"...", "amount":100, ...}'
# Expected: 401 Unauthorized
```

### Authorization Layer
```bash
# Should FAIL - customer trying to create payment
curl -X POST http://localhost:3000/api/payments/create \
  -H "Authorization: Bearer CUSTOMER_TOKEN" \
  -d '{"userId":"...", "amount":100, ...}'
# Expected: 403 Forbidden - Only staff/admin can create
```

### Input Validation Layer
```bash
# Should FAIL - invalid UUID
curl -X POST http://localhost:3000/api/payments/create \
  -H "Authorization: Bearer STAFF_TOKEN" \
  -d '{"userId":"not-a-uuid", "amount":100, ...}'
# Expected: 400 Bad Request - Invalid UUID
```

### Rate Limiting Layer
```bash
# Send 25 requests in 60 seconds
for i in {1..25}; do
  curl -X POST http://localhost:3000/api/payments/create \
    -H "Authorization: Bearer TOKEN" \
    -d '...'
done
# Expected: 429 Too Many Requests after 20th request
```

### Tenant Isolation Layer
```bash
# Try to access payment from different tenant
curl -X POST http://localhost:3000/api/payments/reset-failed \
  -H "Authorization: Bearer TOKEN_TENANT_A" \
  -d '{"appointmentId":"APPOINTMENT_FROM_TENANT_B"}'
# Expected: 404 Not Found (hidden as unauthorized)
```

---

## 📊 Audit Log Verification

After each test, check the audit logs in Supabase:

1. Go to Supabase Dashboard → SQL Editor
2. Run:
```sql
SELECT 
  id,
  user_id,
  action,
  status,
  error_message,
  details,
  created_at
FROM audit_logs
WHERE action IN ('create_payment', 'reset_failed_payment', 'confirm_cash_payment')
ORDER BY created_at DESC
LIMIT 20;
```

**What to verify:**
- ✅ Successful actions logged with `status='success'`
- ✅ Failed auth attempts logged with `status='failed'`
- ✅ User IDs and tenant IDs recorded correctly
- ✅ IP addresses logged
- ✅ Duration_ms shows performance
- ✅ All security checks documented in details

---

## 🎯 Test Checklist

### Authentication
- [ ] Payment creation WITH valid Bearer token → Works ✅
- [ ] Payment creation WITHOUT Bearer token → 401 ❌
- [ ] Payment creation with INVALID token → 401 ❌
- [ ] Audit log shows failed auth attempt

### Authorization
- [ ] Staff can create payments ✅
- [ ] Admin can create payments ✅
- [ ] Customer CANNOT create payments ❌
- [ ] Audit log shows authorization failure

### Input Validation
- [ ] Valid UUID format accepted ✅
- [ ] Invalid UUID rejected ❌
- [ ] Missing fields rejected ❌
- [ ] Invalid email rejected ❌
- [ ] Invalid amount rejected ❌

### Rate Limiting
- [ ] First 20 requests per minute → OK ✅
- [ ] Request 21+ within 60s → 429 ❌
- [ ] After 60s window → Reset, OK again ✅

### Tenant Isolation
- [ ] Can access own tenant's payments ✅
- [ ] Cannot access other tenant's payments ❌
- [ ] Audit log shows tenant_id check

### Data Integrity
- [ ] Payment created with correct tenant_id ✅
- [ ] Appointment linked correctly ✅
- [ ] Metadata stored properly ✅
- [ ] Status transitions correctly

### Audit Logging
- [ ] All actions logged ✅
- [ ] User ID recorded ✅
- [ ] IP address recorded ✅
- [ ] Duration tracked ✅
- [ ] Success/failure recorded ✅

---

## 🚀 Next Steps

After local testing:

1. **Fix any issues** found during testing
2. **Commit changes**: `git commit -m "..."`
3. **Push to GitHub**: `git push origin main`
4. **Test on Production** (if applicable)
5. **Monitor Audit Logs** in production
6. **Secure remaining Payment APIs**:
   - `status.post.ts`
   - `settle-and-email.post.ts`

---

## 📝 Troubleshooting

### Issue: "Authentication required" on valid token
- Check token hasn't expired
- Verify Bearer format: `Bearer <token>` (space required)
- Check Supabase auth is working

### Issue: Rate limit error immediately
- Reset-failed.post.ts might have cached rate limit
- Wait 60 seconds or restart dev server
- Check rate limiter is resetting properly

### Issue: "Tenant isolation violation" error
- Make sure you're using YOUR tenant's auth token
- Verify customer belongs to YOUR tenant
- Check appointment is in YOUR tenant

### Issue: Audit logs not showing
- May have caching issues
- Refresh Supabase SQL query
- Check service role is writing audit logs

---

## 🔐 Security Validation Checklist

After all tests pass:

- [ ] All 10 security layers implemented
- [ ] Rate limiting prevents brute force
- [ ] Tenant isolation enforced
- [ ] Role-based authorization working
- [ ] All actions audited and logged
- [ ] Error messages don't leak sensitive info
- [ ] No SQL injection possible
- [ ] No unauthorized data access possible
- [ ] Performance acceptable (<1s per request)
- [ ] Monitoring and alerts configured





