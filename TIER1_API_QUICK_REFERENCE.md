# TIER 1 APIs - Quick Reference Card

## 📌 API Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    TIER 1 Admin APIs (5 total)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1️⃣  POST /api/admin/check-transaction-token                   │
│      Purpose: Check if Wallee transaction has token            │
│      Rate Limit: 30/min                                         │
│      Auth: Any admin role                                       │
│      Input: transactionId (numeric)                             │
│      Response: { success, data: transaction_details }           │
│                                                                 │
│  2️⃣  POST /api/admin/fix-missing-payment-tokens                │
│      Purpose: Save missing payment tokens retroactively        │
│      Rate Limit: 10/min (stricter!)                             │
│      Auth: super_admin ONLY                                     │
│      Input: paymentId OR (transactionId + userId + tenantId)    │
│      Response: { success, tokenId, paymentId }                 │
│                                                                 │
│  3️⃣  GET /api/admin/test-email-config                          │
│      Purpose: Test email configuration (safe)                  │
│      Rate Limit: 5/hour                                         │
│      Auth: super_admin ONLY                                     │
│      Input: (none)                                              │
│      Response: { success, message, recommendations }           │
│                                                                 │
│  4️⃣  GET /api/admin/test-smtp-config                           │
│      Purpose: Test SMTP configuration (safe)                   │
│      Rate Limit: 5/hour                                         │
│      Auth: super_admin ONLY                                     │
│      Input: (none)                                              │
│      Response: { success, message, recommendations }           │
│                                                                 │
│  5️⃣  POST /api/admin/send-device-verification                  │
│      Purpose: Send device verification email                   │
│      Rate Limit: 20/min (IP) + 50/hour (User)                   │
│      Auth: admin/super_admin                                    │
│      Input: userId, deviceId, userEmail, deviceName            │
│      Response: { success, verificationLink, expiresAt }        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Layer Checklist

```
✅ Authentication    - getAuthenticatedUser() check
✅ Authorization     - Role-based access control
✅ Rate Limiting     - Dual-limit where needed (IP + User)
✅ Input Validation  - UUID/Email/Numeric format checks
✅ Sanitization      - DOMPurify for user strings
✅ Audit Logging     - All actions logged to DB
✅ Error Handling    - Proper HTTP status codes
```

---

## 🧪 Quick Test Commands

```bash
# Setup
TOKEN="your_access_token"
BASE_URL="http://localhost:3000"

# Test 1
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/admin/check-transaction-token?transactionId=428029614"

# Test 2
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paymentId": "6db0ec32-6d04-410c-b3fe-9318d45166d1"}' \
  "$BASE_URL/api/admin/fix-missing-payment-tokens"

# Test 3
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/admin/test-email-config"

# Test 4
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/admin/test-smtp-config"

# Test 5
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"...", "deviceId":"...", "userEmail":"...", "deviceName":"..."}' \
  "$BASE_URL/api/admin/send-device-verification"
```

---

## 📊 Response Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Request succeeded |
| 400 | Bad Request | Invalid input format |
| 401 | Unauthorized | No/invalid auth token |
| 403 | Forbidden | Insufficient permissions |
| 429 | Rate Limited | Too many requests |
| 500 | Server Error | Internal error |

---

## 🔑 Getting Your Access Token

```javascript
// Browser Console:
JSON.parse(localStorage.getItem('sb-unyjaetebnaexaflpyoc-auth-token')).access_token

// Or with Terminal (when logged in):
export TOKEN="paste_here"
```

---

## ✅ Success Indicators

- ✅ Authenticated requests return 200
- ✅ Unauthenticated requests return 401
- ✅ Non-admin requests return 403
- ✅ Rate limit triggers 429 after X requests
- ✅ Invalid input returns 400
- ✅ Audit logs appear in DB
- ✅ Response has consistent format

---

## 🚀 When to Move to TIER 2

After ALL tests pass:
1. ✅ All 5 APIs working
2. ✅ Authentication/Authorization working
3. ✅ Rate limiting functional
4. ✅ Audit logs present
5. ✅ Error handling correct

→ **Ready for TIER 2!**

---

## 📝 Audit Log Query

```sql
-- Check all admin API calls
SELECT 
  id, user_id, action, status, 
  details, created_at
FROM audit_logs
WHERE action LIKE 'admin_%'
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🎓 What Each Layer Does

| Layer | Purpose | Example |
|-------|---------|---------|
| Auth | Verify user exists | 401 if no token |
| AuthZ | Verify permissions | 403 if not admin |
| Rate Limit | Prevent abuse | 429 after 30 requests |
| Validation | Ensure format | 400 if not UUID |
| Sanitization | Prevent XSS | Strip HTML from inputs |
| Audit Log | Track actions | Log to DB |
| Error Handle | Safe failure | Return 500 not crash |

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Relogin, refresh token |
| 403 Forbidden | Check your user role |
| 429 Rate Limited | Wait 1 minute, try again |
| 500 Server Error | Check dev server logs |
| No audit logs | Run migrations, check DB |

---

*Quick Reference: 3. Januar 2026*  
*Print this and keep nearby during testing!*

