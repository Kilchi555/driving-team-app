# API Security Audit - Comprehensive Analysis

**Date:** Jan 4, 2026  
**Total APIs:** 160  
**APIs with Auth:** 44  
**APIs without Auth:** 116 (but many are intentionally public)

---

## Priority 1: CRITICAL - Must Fix Immediately

### 1.1 Payment APIs (HIGH RISK - Financial Data)
- ❌ `/api/payments/create.post.ts` - NO AUTH, handles money!
  - Problem: Missing Bearer token validation
  - Fix: Add auth check, tenant isolation, rate limiting
  - Impact: Anyone can create payments

- ❌ `/api/payments/reset-failed.post.ts` - NO AUTH
  - Problem: Missing auth check
  - Fix: Require Bearer token + admin/staff role
  - Impact: Anyone can reset payment status

- ❌ `/api/payments/status.post.ts` - NO AUTH
  - Problem: Missing auth check
  - Fix: Require Bearer token

- ❌ `/api/payments/confirm-cash.post.ts` - NO AUTH
  - Problem: Missing auth check
  - Fix: Require Bearer token + role check

- ❌ `/api/payments/settle-and-email.post.ts` - NO AUTH
  - Problem: Missing auth check
  - Fix: Require Bearer token + admin/staff role

### 1.2 Appointment APIs (HIGH RISK - Business Logic)
- ❌ `/api/appointments/confirm.post.ts` - NO AUTH
  - Problem: Missing auth check
  - Fix: Bearer token + tenant check

- ❌ `/api/appointments/resend-confirmation.post.ts` - NO AUTH
  - Problem: Missing auth check
  - Fix: Bearer token + tenant check

- ❌ `/api/appointments/adjust-duration.post.ts` - NO AUTH
  - Problem: Missing auth check
  - Fix: Bearer token + staff/admin role

- ❌ `/api/appointments/cancel-customer.post.ts` - NO AUTH
  - Problem: Missing auth check
  - Fix: Bearer token + customer/staff role

- ❌ `/api/appointments/save.post.ts` - NO AUTH
  - Problem: Missing auth check
  - Fix: Bearer token + staff/admin role

### 1.3 Admin APIs (HIGH RISK - Superuser Access)
- ❌ `/api/admin/add-student.post.ts` - Has minimal auth
  - Problem: May lack rate limiting, audit logging
  - Fix: ✅ Already secured with 10 security layers (DONE)

---

## Priority 2: MEDIUM - Should Fix Soon

### 2.1 SMS APIs
- ❌ `/api/sms/send.post.ts` - NO AUTH
  - Problem: Missing auth check
  - Fix: Bearer token + staff/admin role

### 2.2 Calendar APIs
- ❌ `/api/calendar/get-appointments.get.ts` - NO AUTH
  - Problem: Missing auth check
  - Fix: Bearer token + tenant filter

- ⚠️ `/api/calendar/ics.get.ts` - Public (intentional)
  - Note: Should have token-based access control

### 2.3 Invoice APIs
- ❌ `/api/invoices/download.post.ts` - NO AUTH
  - Problem: Missing auth check
  - Fix: Bearer token + customer/staff role

### 2.4 SARI Integration APIs
- ⚠️ `/api/sari/validate-student.post.ts` - Possible missing auth
- ⚠️ `/api/sari/enroll-student.post.ts` - Possible missing auth
- ⚠️ `/api/sari/unenroll-student.post.ts` - Possible missing auth

---

## Priority 3: LOW - Public/Optional

### 3.1 Auth APIs (Intentionally Public)
- ✅ `/api/auth/login.post.ts` - PUBLIC (ok)
- ✅ `/api/auth/reset-password.post.ts` - PUBLIC (ok)
- ✅ `/api/auth/validate-reset-token.post.ts` - PUBLIC (ok)

### 3.2 Webhook APIs (Secret-based)
- ✅ `/api/wallee/webhook.post.ts` - SECRET SIGNATURE (ok)
- ✅ `/api/wallee/webhook-payment.post.ts` - SECRET SIGNATURE (ok)

### 3.3 External Sync (Token-based)
- ✅ `/api/external-calendars/sync-ics.post.ts` - May have token validation

---

## Security Layers Template

Each API should implement these 10 security layers:

```typescript
// Layer 1: Authentication
// - Check Bearer token
// - Validate JWT via Supabase

// Layer 2: Rate Limiting
// - Max N requests per user per minute
// - Prevent brute force/DDoS

// Layer 3: Input Validation
// - UUID format check
// - Required fields check
// - Type validation

// Layer 4: Authorization & Tenant Isolation
// - Check user's role
// - Filter by tenant_id
// - Verify ownership

// Layer 5: Audit Logging
// - Log who, what, when
// - Log success/failure
// - Log IP address

// Layer 6: Error Handling
// - Generic error messages to client
// - Detailed logs for debugging
// - No stack traces to client

// Layer 7: Response Sanitization
// - Don't return sensitive fields
// - Mask PII (phone, email)

// Layer 8: Transaction Safety
// - Handle partial failures
// - Rollback on error

// Layer 9: Monitoring
// - Alert on suspicious patterns
// - Track error rates

// Layer 10: Documentation
// - Security model documented
// - Threat model analyzed
```

---

## Recommended Fixes (By Priority)

### Phase 1: Payment APIs (This Week)
1. `/api/payments/create.post.ts` - Add Bearer auth + tenant check + rate limit
2. `/api/payments/reset-failed.post.ts` - Add Bearer auth + admin role check
3. `/api/payments/status.post.ts` - Add Bearer auth + tenant check
4. `/api/payments/confirm-cash.post.ts` - Add Bearer auth + admin role check
5. `/api/payments/settle-and-email.post.ts` - Add Bearer auth + admin role check

### Phase 2: Appointment APIs (Next Week)
1. `/api/appointments/confirm.post.ts` - Add Bearer auth + customer check
2. `/api/appointments/resend-confirmation.post.ts` - Add Bearer auth + staff check
3. `/api/appointments/adjust-duration.post.ts` - Add Bearer auth + staff check
4. `/api/appointments/cancel-customer.post.ts` - Add Bearer auth + customer/staff check
5. `/api/appointments/save.post.ts` - Add Bearer auth + staff check

### Phase 3: SMS & Invoice APIs (Following Week)
1. `/api/sms/send.post.ts` - Add Bearer auth + staff check + rate limit
2. `/api/invoices/download.post.ts` - Add Bearer auth + customer check

### Phase 4: SARI Integration (Month 2)
1. Audit all SARI endpoints
2. Verify they have proper secret validation
3. Add rate limiting
4. Add audit logging

---

## Already Secured APIs

### ✅ Tier 1 (Full 10 Layers)
- `/api/students/resend-onboarding-sms.post.ts` - DONE (just fixed!)
- `/api/admin/add-student.post.ts` - DONE
- `/api/students/get-onboarding-token.get.ts` - DONE

### ✅ Tier 2 (Partial)
- `/api/payments/list.get.ts` - Has auth + tenant check
- `/api/admin/get-pending-appointments.get.ts` - Has auth check

---

## Next Steps

1. **Start with Phase 1** - Payment APIs are highest risk
2. **Use the template** - Copy security layer structure
3. **Test each fix** - Verify auth works before next API
4. **Document as you go** - Keep audit log
5. **Monitor production** - Watch for abuse patterns

---

## Quick Template for New APIs

```typescript
import { defineEventHandler, getHeader, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  let authenticatedUserId: string | undefined
  let tenantId: string | undefined

  try {
    // 1. AUTHENTICATION
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }

    const token = authHeader.substring(7)
    const supabaseAdmin = getSupabaseAdmin()
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
    }

    authenticatedUserId = user.id

    // 2. RATE LIMITING
    const canProceed = await checkRateLimit(authenticatedUserId, 'your_endpoint', 10, 60000)
    if (!canProceed) {
      throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
    }

    // 3-4. AUTHORIZATION & TENANT ISOLATION
    const { data: requestingUser } = await supabaseAdmin
      .from('users')
      .select('tenant_id, role')
      .eq('auth_user_id', authenticatedUserId)
      .single()

    if (!requestingUser) {
      throw createError({ statusCode: 403, statusMessage: 'Unauthorized' })
    }

    tenantId = requestingUser.tenant_id

    // Your logic here...

    // 5. AUDIT LOGGING
    await logAudit({
      user_id: authenticatedUserId,
      action: 'your_action',
      status: 'success',
      details: { tenantId }
    })

    return { success: true }

  } catch (error: any) {
    logger.error('Error:', error)
    await logAudit({
      user_id: authenticatedUserId,
      action: 'your_action',
      status: 'error',
      error_message: error.message
    })
    throw error
  }
})
```

---

## Status

- Total APIs: 160
- Fully Secured (10 layers): 3
- Partially Secured: 5
- Unsecured but Public: ~110
- **Unsecured + Critical: ~42** ← **FIX FIRST**

