# CRON APIs - Security Upgrade Plan

**Goal:** Upgrade 4 Cron Jobs with 10-Layer Security Stack

---

## 🎯 APIs to Upgrade

```
1. cron/cleanup-booking-reservations   (every minute)
2. cron/cleanup-expired-reservations   (every hour)
3. cron/process-automatic-payments     (every 5 min)
4. cron/sync-sari-courses              (? - not in vercel.json)
```

**Status:** 3/4 are active in Vercel, 1 missing from config

---

## 🔒 10-LAYER SECURITY STACK

### ✅ Layer 1: Authentication
```typescript
// Verify request is from Vercel Cron (using Authorization header)
const cronToken = getHeader(event, 'authorization')
if (cronToken !== `Bearer ${process.env.CRON_SECRET}`) {
  throw createError({ statusCode: 401, message: 'Unauthorized' })
}
```

### ✅ Layer 2: Authorization (Super Admin Only)
```typescript
// Cron jobs can be triggered by super_admin via manual endpoint
// OR only from Vercel (no manual user trigger needed)
// For now: Only Vercel (service-to-service, no user context)
```

### ✅ Layer 3: Rate Limiting
```typescript
// Prevent accidental re-triggers
// Use a flag in database: cron_last_run timestamp
// If running within last 30 seconds: skip
```

### ✅ Layer 4: Input Validation
```typescript
// No user input (internal system process)
// Validate query parameters if any exist
```

### ✅ Layer 5: Input Sanitization
```typescript
// No user input to sanitize
// Internal queries only
```

### ✅ Layer 6: Audit Logging
```typescript
// Log every cron run:
// - started_at
// - completed_at
// - deleted_count / processed_count
// - success / error
// - error_message (if failed)
```

### ✅ Layer 7: Error Handling
```typescript
// Detailed error responses
// Log to error_logs table
// Send alert if process fails
```

### ✅ Layer 8: CSRF Protection
```typescript
// Not applicable (service-to-service, no user session)
```

### ✅ Layer 9: Security Headers
```typescript
// Not applicable (API endpoint, not browser)
```

### ✅ Layer 10: Monitoring & Alerting
```typescript
// Track cron job execution:
// - Success rate
// - Average runtime
// - Last run timestamp
// Alert if: failed, took too long, didn't run
```

---

## 📋 Implementation Steps

### Step 1: Add Cron Secret to .env
```env
CRON_SECRET=your-secret-here
```

### Step 2: Create Audit Table
```sql
CREATE TABLE cron_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  status 'success' | 'failed',
  deleted_count INTEGER,
  processed_count INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT now()
)
```

### Step 3: Update Each Cron API
- Add auth token check
- Add rate limiting (prevent re-trigger)
- Add audit logging
- Improve error handling
- Return detailed status

### Step 4: Monitor Dashboard
- Show last 10 cron runs
- Alert on failures
- Show stats (deleted/processed items)

---

## ⚠️ RISKS without Security

```
🚨 Cron APIs are currently UNSECURED:
- No authentication (anyone can trigger!)
- No rate limiting
- No audit trail
- Poor error handling

Attack Vector:
- Anyone can call /api/cron/cleanup-booking-reservations
- Could spam and cause performance issues
- No way to trace who called it
```

---

## ✅ Implementation Priority

```
HIGH:
1. Add auth token verification (prevents misuse)
2. Add rate limiting (prevents spamming)
3. Add audit logging (track execution)

MEDIUM:
4. Improve error handling (better debugging)
5. Add database monitoring table (track stats)

LOW:
6. Create admin dashboard (view cron status)
7. Add alerting (email on failure)
```

---

## 🤔 Ready to implement?

1. Start with auth token + rate limiting + logging
2. Then improve error handling
3. Then add monitoring dashboard

Oder eine andere Priortat?

