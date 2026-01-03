# SARI APIs - Security Upgrade Plan

**Date:** January 3, 2026  
**Status:** Planning Phase  
**Target:** Secure 4 SARI Admin APIs with 7-layer stack

---

## 📊 Current Security Status

### ✅ ALREADY IMPLEMENTED:
- Layer 1: Authentication (JWT token verification)
- Layer 4: Authorization (role check: admin/staff/super_admin)
- Layer 4: Ownership (tenant_id check - user belongs to tenant)
- Layer 3: Input Validation (courseSessionId, studentId required fields)
- Layer 7: Error Handling (structured error messages)
- SARI-specific errors (PERSON_NOT_FOUND, COURSE_NOT_FOUND, LICENSE_EXPIRED)

### ❌ MISSING:
- Layer 2: Rate Limiting (no rate limits per user/IP)
- Layer 3: Input Sanitization (no additional sanitization)
- Layer 3: Enhanced validation (UUID format, numeric checks)
- Layer 5: Audit Logging (no logging of enrollment/unenrollment)
- Layer 6: Security Headers awareness
- Prevent credential leakage in error messages

---

## 🔒 Upgrade Plan - Layer by Layer

### Layer 1: Authentication ✅ (Already good)
```typescript
// Current: JWT token validation from header
const token = authHeader.replace('Bearer ', '')
const { data: { user } } = await supabase.auth.getUser(token)
// Status: ✅ Already implemented correctly
```

### Layer 2: Rate Limiting ❌ (NEW)
```typescript
// Add: Check rate limits per user
- 60 requests/minute per user (not as aggressive as API keys)
- Store in redis or supabase rate_limits table
- Return 429 Too Many Requests if exceeded
```

### Layer 3: Input Validation ✅ (Partially good, enhance)
```typescript
// Enhance current validation:
- Validate courseSessionId is valid UUID (regex)
- Validate studentId is valid UUID (regex)
- Validate birthdate format (already doing)
- Validate FABERID format (should exist)
```

### Layer 3: Input Sanitization ❌ (NEW)
```typescript
// Add: Remove potentially dangerous characters
- Birthdate: already safe (date parsing)
- FABERID: trim, validate alphanumeric only
```

### Layer 4: Authorization ✅ (Good, keep)
```typescript
// Current: Check user role and tenant membership
- Only admin/staff/super_admin
- Only can manage students in their own tenant
// Status: ✅ Already good
```

### Layer 5: Audit Logging ❌ (NEW)
```typescript
// Add: Log all enrollment/unenrollment actions
- Who (user_id)
- What (enroll/unenroll student in course)
- When (timestamp)
- Which student (student_id, faberid)
- Which course (course_id, sari_course_id)
- Status (success/failed)
- IP address (from request)
```

### Layer 7: Error Handling ✅ (Good, enhance)
```typescript
// Current: Good SARI-specific errors
// Add: Don't leak SARI credentials in error messages
// Status: Mostly good, minor improvements
```

---

## 📋 Implementation Tasks

### Task 1: Add Rate Limiting Utility
- Create `server/utils/rate-limiter.ts` (if not exists)
- Add `checkRateLimit(user_id, endpoint, limit)` function
- Store in supabase `rate_limits` table

### Task 2: Enhance Input Validation
```typescript
// For all 4 SARI APIs:

// UUID validation
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// Apply to: courseSessionId, studentId
```

### Task 3: Add Audit Logging
```typescript
// After successful enrollment/unenrollment:
await logAudit({
  user_id: user.id,
  action: 'sari_enroll_student',
  resource_type: 'course_registration',
  resource_id: registration?.id,
  status: 'success',
  details: {
    student_id: studentId,
    course_id: course.id,
    faberid: student.faberid,
    sari_course_id: sariCourseId
  },
  ip_address: getClientIP(event)
})
```

### Task 4: Create Rate Limits Table
```sql
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 0,
  reset_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_rate_limits_user_endpoint 
  ON rate_limits(user_id, endpoint, reset_at);
```

---

## 🎯 APIs to Upgrade

1. **sari/enroll-student.post.ts**
   - Add rate limiting
   - Add input validation (UUID format)
   - Add audit logging
   - Add IP tracking

2. **sari/unenroll-student.post.ts**
   - Same as enroll-student

3. **sari/validate-student.post.ts**
   - Same as enroll-student

4. **sari/test-participants.post.ts**
   - Same as enroll-student

---

## 📊 Effort Estimate

- Rate Limiter Utility: 30 min
- Rate Limits Table: 10 min
- Enhance each API (4 APIs × 20 min): 80 min
- Testing & Fixes: 30 min
- **Total: ~2.5 hours**

---

## ✅ Success Criteria

- All 4 SARI APIs have rate limiting (60 req/min per user)
- All inputs validated (UUID format, required fields)
- All actions audited (audit_logs table)
- No SARI credentials leaked in error messages
- Unit tests for rate limiting


