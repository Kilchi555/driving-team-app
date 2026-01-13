# Admin API Security Upgrade - TIER 1 Checklist

**Goal:** 5 Low-Risk Admin-APIs mit vollständiger 7-Layer Security upgraden  
**Status:** In Progress 🚀

---

## 📋 Tier 1 APIs: Detailed Security Audit

### 1️⃣ POST /api/admin/check-transaction-token

**Current State:**
```
✅ Input Validation: transactionId required (string)
❌ Rate Limiting: MISSING
❌ Authentication: MISSING - Anyone can call!
❌ Authorization: MISSING - No role check
❌ Audit Logging: MISSING
❌ Input Sanitization: Partial (UUID validation missing)
❌ Error Handling: Basic (no error tracking)
```

**Issues Found:**
- **🔴 CRITICAL:** No auth check! Anonymous users can call!
- **🔴 CRITICAL:** No rate limiting! Brute force possible!
- Query parameter not validated as UUID format
- Error not logged to audit log
- No IP tracking

**Fixes Needed:**
```typescript
1. Add getAuthenticatedUser() → get user ID & role
2. Add role check → admin/super_admin only
3. Add checkRateLimit(ip, 'check_transaction', 30, 60000)
4. Validate transactionId as UUID format
5. Log to audit: { user_id, action, transactionId, ip, status_code }
6. Wrap in try-catch with proper error responses
```

**Effort:** 20 minutes

---

### 2️⃣ POST /api/admin/fix-missing-payment-tokens

**Current State:**
```
✅ Input Validation: Partial (body params checked)
❌ Rate Limiting: MISSING
❌ Authentication: MISSING
❌ Authorization: MISSING
❌ Audit Logging: MISSING (logger.debug only)
❌ Input Sanitization: MISSING
❌ Error Handling: Okay but no audit trail
```

**Issues Found:**
- **🔴 CRITICAL:** No auth check!
- **🔴 CRITICAL:** No rate limiting!
- Modifies `payments` table without audit trail
- Uses Wallee API without rate limit
- logger.debug goes to console, not DB

**Fixes Needed:**
```typescript
1. Add getAuthenticatedUser()
2. Add role check (super_admin only)
3. Add checkRateLimit(ip, 'fix_tokens', 10, 60000)  // More restrictive!
4. Validate: paymentId as UUID OR (transactionId as number + userId as UUID + tenantId as UUID)
5. Log BEFORE & AFTER to audit_logs table:
   - BEFORE: transaction ID checked
   - AFTER: token saved, paymentId updated
6. Add transaction rollback on error
```

**Effort:** 25 minutes

---

### 3️⃣ GET /api/admin/test-email-config

**Current State:**
```
✅ Input Validation: N/A (no params)
❌ Rate Limiting: MISSING
❌ Authentication: MISSING - Anyone can test!
❌ Authorization: MISSING
❌ Audit Logging: MISSING
❌ Input Sanitization: N/A
🟡 Error Handling: Okay
```

**Issues Found:**
- **🔴 CRITICAL:** Anyone can call! Can check if Supabase is configured!
- **🔴 HIGH:** Can spam email signup endpoint via Supabase!
- Creates test user (email verification clutter)
- No rate limiting

**Fixes Needed:**
```typescript
1. Add getAuthenticatedUser()
2. Add role check (super_admin only)
3. Add checkRateLimit(ip, 'test_email', 5, 3600000)  // 5/hour max!
4. Dont create actual test user! Only check config
5. Log test attempt to audit_logs
6. Return sanitized response (no internal details)
```

**Effort:** 15 minutes

---

### 4️⃣ GET /api/admin/test-smtp-config

**Current State:**
```
✅ Input Validation: N/A (no params)
✅ Service role used (good!)
❌ Rate Limiting: MISSING
❌ Authentication: MISSING
❌ Authorization: MISSING
❌ Audit Logging: MISSING
🟡 Error Handling: Okay
```

**Issues Found:**
- **🔴 CRITICAL:** Anyone can call! Can create test users!
- Creates actual auth users (email verification clutter!)
- No rate limiting
- No audit trail

**Fixes Needed:**
```typescript
1. Add getAuthenticatedUser()
2. Add role check (super_admin only)
3. Add checkRateLimit(ip, 'test_smtp', 5, 3600000)  // 5/hour max!
4. Don't create actual users! Check service role + email config instead
5. Log to audit_logs
6. Return minimal response
```

**Effort:** 15 minutes

---

### 5️⃣ POST /api/admin/send-device-verification

**Current State:**
```
✅ Input Validation: Basic (userId, deviceId, userEmail checked)
✅ Service role used (good!)
❌ Rate Limiting: MISSING
❌ Authentication: MISSING - Anyone can send verification!
❌ Authorization: MISSING - Can send to ANY device!
❌ Audit Logging: MISSING (logger.debug only)
🟡 Input Sanitization: Missing DOMPurify for deviceName
🟡 Error Handling: Okay
```

**Issues Found:**
- **🔴 CRITICAL:** Anyone can send verification emails to ANY email address!
  - Could spam users with device verification emails
  - Could be used for phishing (create fake device)
- **🔴 HIGH:** No check if userId owns the device!
- deviceName not sanitized (could contain XSS in email)
- No rate limiting per user
- No audit trail

**Fixes Needed:**
```typescript
1. Add getAuthenticatedUser()
2. Add role check (admin/super_admin)
3. Add checkRateLimit(ip, 'send_verification', 20, 60000)  // Per IP
4. Add checkRateLimit(userId, 'send_verification_user', 50, 3600000)  // Per user per hour
5. Validate: userId, deviceId, userEmail all UUIDs/emails
6. Verify: userId owns the device (query device with user_id = userId)
7. Sanitize: deviceName with DOMPurify.sanitize()
8. Log to audit_logs: who sent to whom, result, error if any
9. Wrap Supabase update in transaction
```

**Effort:** 25 minutes

---

## 🛠️ Implementation Template

Alle 5 APIs folgen diesem Pattern:

```typescript
import { defineEventHandler, readBody, createError, getQuery } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'
import { sanitize } from 'isomorphic-dompurify'

export default defineEventHandler(async (event) => {
  try {
    // 1. AUTHENTICATION
    const user = await getAuthenticatedUser(event)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    // 2. AUTHORIZATION
    if (!['admin', 'super_admin'].includes(user.role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - Admin role required'
      })
    }

    // 3. RATE LIMITING
    const ip = getClientIP(event)
    const rateLimitKey = `admin_${event._route || event.node.req.url}`
    const { allowed, retryAfter } = await checkRateLimit(
      ip,
      rateLimitKey,
      30,  // Max requests
      60000  // Time window (1 min)
    )

    if (!allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: `Rate limit exceeded. Retry after ${retryAfter}ms`
      })
    }

    // 4. INPUT VALIDATION
    const body = await readBody(event)
    if (!body.someParam) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required field: someParam'
      })
    }

    // 5. INPUT SANITIZATION
    const sanitizedParam = sanitize(body.someParam)

    // 6. BUSINESS LOGIC
    // ... your code here ...

    // 7. AUDIT LOGGING (AFTER success)
    await logAudit({
      user_id: user.id,
      action: 'admin_api_call',
      resource_type: 'transaction',
      resource_id: body.transactionId,
      status: 'success',
      details: { /* relevant data */ },
      ip_address: ip
    })

    return { success: true, data: result }

  } catch (error: any) {
    // 7. AUDIT LOGGING (ON error)
    await logAudit({
      user_id: user?.id || 'anonymous',
      action: 'admin_api_call_error',
      status: 'error',
      error_message: error.message,
      ip_address: getClientIP(event)
    })

    console.error('Error in admin API:', error)
    throw error
  }
})
```

---

## ✅ Rollout Plan

### Monday Morning (70 minutes total):

```
09:00 - 09:20 (20 min): Upgrade #1 - check-transaction-token
  - Add auth middleware
  - Add rate limiting
  - Add audit logging
  - Test: curl with valid token

09:20 - 09:45 (25 min): Upgrade #2 - fix-missing-payment-tokens
  - Add auth & authorization
  - Add strict rate limiting
  - Add full audit trail
  - Test: Dry-run only

09:45 - 10:00 (15 min): Upgrade #3 - test-email-config
  - Add auth
  - Reduce rate limit to 5/hour
  - Remove actual user creation
  - Test: Call once

10:00 - 10:15 (15 min): Upgrade #4 - test-smtp-config
  - Add auth
  - Same as #3

10:15 - 10:40 (25 min): Upgrade #5 - send-device-verification
  - Add auth & ownership check
  - Dual rate limiting (IP + user)
  - Sanitize deviceName
  - Add full audit trail
  - Test: Send to test device

10:40 - 11:00 (20 min): Testing + Deployment
  - Manual testing all 5 APIs
  - Check audit logs in DB
  - Commit to git
```

---

## 📊 Security Improvements Summary

| API | Auth | AuthZ | Rate Limit | Input Val | Sanitize | Audit | Error |
|-----|------|-------|-----------|-----------|----------|-------|-------|
| BEFORE | ❌ | ❌ | ❌ | 🟡 | ❌ | ❌ | 🟡 |
| **AFTER** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

*Plan created: 3. Januar 2026*

