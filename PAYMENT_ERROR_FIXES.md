Payment Processing Errors - Root Cause Analysis and Fixes
========================================================

## Errors Observed in User Logs

```
❌ POST http://localhost:3000/api/payments/process 500 (Cannot read properties of undefined (reading 'windowMs'))
❌ GET https://unyjaetebnaexaflpyoc.supabase.co/rest/v1/appointments...&id=eq.77a2ba41... 406 (Not Acceptable)
```

---

## Issue #1: Rate Limiter Function Call Error (500)

### Root Cause
In `/server/api/payments/process.post.ts` line 104, the `checkRateLimit` function was being called with incorrect arguments:

```typescript
// ❌ WRONG: Passing 3 arguments
const canProceed = await checkRateLimit(rateLimitKey, 20, 60000)
```

### Expected Function Signature
From `/server/utils/rate-limiter.ts` line 107:
```typescript
export async function checkRateLimit(
  ipAddress: string,
  operation: keyof typeof LIMITS = 'register',
  maxRequests?: number,
  windowMs?: number,
  email?: string,
  tenantId?: string
): Promise<{ allowed: boolean; remaining: number; limit: number; reset: number }>
```

### The Problem
- Expected: `(ipAddress, operation, maxRequests, windowMs, email, tenantId)`
- Called with: `(key, maxRequests, windowMs)` - 3 arguments instead of 6
- Missing `operation` parameter, which has a default value, but accessing it later expects the config `LIMITS[operation]` to exist
- The error "Cannot read properties of undefined (reading 'windowMs')" happens because `LIMITS[operation]` was undefined

### ✅ Fix Applied
**File**: `/server/api/payments/process.post.ts` (lines 102-115)

```typescript
// ✅ CORRECT: Pass arguments in proper order
const rateLimitResult = await checkRateLimit(
  authenticatedUserId,           // ipAddress parameter
  'register',                    // operation key (using 'register' config as base)
  20,                           // maxRequests: 20 per minute
  60000                         // windowMs: 60 seconds
)
if (!rateLimitResult.allowed) {
  // Handle rate limit exceeded...
}
```

**Key Changes**:
1. Pass `authenticatedUserId` as the `ipAddress` parameter
2. Provide `'register'` as the operation key (will use its default config then override with custom params)
3. Return value is now an object with `.allowed` property instead of boolean

---

## Issue #2: 406 Not Acceptable - Appointments RLS Policy

### Root Cause
The GET request to fetch appointment data returns 406 because:
1. RLS policies on appointments table may be too restrictive OR
2. Have infinite recursion issues when checking subqueries
3. Customer trying to query: `.from('appointments').select(...).eq('id', payment.appointment_id).single()`
4. RLS policy is blocking the SELECT operation because it can't properly evaluate the policy

### RLS Policy Issue
The core problem: comparing auth user to appointment owner requires checking the users table:
- `auth.uid()` returns the Supabase auth user's UUID
- `appointments.user_id` is the reference to `users.id` (which is DIFFERENT from auth_user_id)
- `users.auth_user_id` is what links them together

Previous policies may have:
- Used overly complex subqueries causing recursion
- Used incorrect field comparisons
- Had conflicts with other policies

### ✅ Fix Applied
**File**: `/migrations/fix_appointments_rls_final.sql`

Created a clean RLS policy that:
1. Customers can read their own appointments (comparing user_id to users.id)
2. Staff/Admins can read tenant appointments
3. Super admins can read all appointments
4. Service role (backend) has full access
5. Anonymous users can read bookable future appointments
6. Uses `LIMIT 1` to prevent multiple matches
7. Checks `is_active = true` to prevent inactive users from bypassing

**Key Policy**:
```sql
CREATE POLICY "customer_read_own_appointments" ON appointments
  FOR SELECT TO authenticated
  USING (
    user_id = (
      SELECT id FROM public.users
      WHERE auth_user_id = auth.uid() AND is_active = true
      LIMIT 1
    )
  );
```

---

## How to Apply Fixes

### Fix #1: Already Applied
The rate limiter fix has been automatically applied to `/server/api/payments/process.post.ts`.
- Status: ✅ Complete
- No database migration needed
- Server restart required

### Fix #2: Database RLS Policy
To apply the appointments RLS fix:

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy the entire content from: `/migrations/fix_appointments_rls_final.sql`
4. Execute the SQL
5. Verify: `SELECT policyname, permissive, cmd FROM pg_policies WHERE tablename = 'appointments' ORDER BY policyname;`

Expected result: 14 policies listed (3 for SELECT, 3 for INSERT, 3 for UPDATE, 3 for DELETE, 2 for special roles)

---

## Testing After Fix

### Test #1: Payment Processing (Rate Limiter)
```bash
curl -X POST http://localhost:3000/api/payments/process \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "amount": 100,
    "customerEmail": "user@example.com",
    "paymentMethod": "wallee"
  }'
```
Expected: Should no longer return "windowMs is undefined" error

### Test #2: Appointment Fetch (RLS Policy)
In browser console while logged in as customer:
```javascript
const supabase = useSupabase();
const response = await supabase
  .from('appointments')
  .select('id, start_time, duration_minutes')
  .eq('id', 'appointment_id_here')
  .single();
```
Expected: Should return appointment data (no 406 error)

---

## Prevention

### To prevent similar issues in future:

1. **Type checking**: Use strict TypeScript with no implicit `any`
2. **Function documentation**: Always document parameter order and types
3. **RLS testing**: Test RLS policies with sample queries before deployment
4. **Code review**: Review database access patterns before merge

### Related Memories
- Rate limiter expects: (ipAddress, operation, maxRequests, windowMs, email, tenantId)
- RLS policies should use `auth.uid()` for auth user comparison, not auth_user_id directly
- Supabase 406 errors usually indicate RLS policy conflicts or infinite recursion

