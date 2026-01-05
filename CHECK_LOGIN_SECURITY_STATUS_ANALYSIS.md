# CHECK_LOGIN_SECURITY_STATUS() - ANALYSIS & IMPROVEMENT PROPOSALS

## Current Implementation ✅

**Function Name:** `check_login_security_status()`  
**Type:** PostgreSQL RPC Function  
**Security Definer:** YES (runs with DB owner privileges)  
**Parameters:**
- `p_email` VARCHAR
- `p_ip_address` VARCHAR
- `p_tenant_id` UUID

**Returns:**
- `allowed` BOOLEAN
- `reason` TEXT
- `mfa_required` BOOLEAN
- `account_locked` BOOLEAN
- `remaining_attempts` INT

---

## Current Checks ✅

### 1. Account Lockout Check
```
IF v_account_locked_until > NOW() THEN
  RETURN: allowed = false, reason = "Account ist gesperrt"
```
✅ **Status:** Working  
✅ **Purpose:** Prevent login if account locked after failed attempts

### 2. IP-Based Failed Attempts
```
COUNT failed attempts from IP in last 24 hours
IF >= max_ip_attempts THEN block
```
✅ **Status:** Working  
✅ **Purpose:** Prevent brute force from same IP

### 3. MFA Requirement Check
```
IF mfa_required_until > NOW() THEN require MFA
```
✅ **Status:** Working  
✅ **Purpose:** Enforce MFA after security events

### 4. Failed Attempts Threshold
```
IF user_failed_attempts >= max_failed_before_mfa THEN require MFA
```
✅ **Status:** Working  
✅ **Purpose:** Escalate security after failed attempts

---

## Issues & Recommendations

### Issue 1: SECURITY DEFINER Risk ⚠️

**Current:**
```sql
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Risk:** 
- Function runs with DB owner privileges
- If function is compromised, attacker gets DB owner access
- Potential for privilege escalation

**Recommendations:**

| # | Recommendation | Effort | Risk Reduction | Priority |
|---|---|---|---|---|
| 1 | Remove SECURITY DEFINER | Low | High | **CRITICAL** |
| 2 | Use SECURITY INVOKER instead | Low | High | **CRITICAL** |
| 3 | Create dedicated role for function | Medium | Very High | **HIGH** |
| 4 | Add GRANT restrictions | Low | Medium | **HIGH** |

**Proposal 1A (Simplest - Recommended):**
```sql
-- Instead of SECURITY DEFINER
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Then ensure caller has proper permissions via RLS policies
```

**Proposal 1B (More Secure):**
```sql
-- Create dedicated restricted role
CREATE ROLE login_security_checker NOINHERIT;

-- Grant only needed function access
GRANT SELECT ON login_security_rules TO login_security_checker;
GRANT SELECT ON users TO login_security_checker;
GRANT SELECT ON login_attempts TO login_security_checker;

-- Apply role to function
ALTER FUNCTION check_login_security_status(...) 
  SET search_path = public;
ALTER FUNCTION check_login_security_status(...) 
  SECURITY INVOKER;
```

---

### Issue 2: No Tenant Isolation Validation ⚠️

**Current:**
```sql
WHERE email = p_email AND is_active = true
-- No tenant check!
```

**Risk:** 
- User from tenant A could check security status for tenant B
- Email lookup doesn't validate tenant ownership
- Potential information leak (timing attack)

**Proposal 2:**

```sql
-- CURRENT (Vulnerable)
SELECT id, failed_login_attempts, mfa_required_until, account_locked_until 
FROM public.users
WHERE email = p_email AND is_active = true  -- ❌ Missing tenant check
LIMIT 1;

-- PROPOSED (Secure)
SELECT id, failed_login_attempts, mfa_required_until, account_locked_until, tenant_id
FROM public.users
WHERE email = p_email 
  AND tenant_id = p_tenant_id  -- ✅ Add tenant isolation
  AND is_active = true
LIMIT 1;

-- Then validate user is in correct tenant
IF v_user_id IS NOT NULL AND user_tenant_id != p_tenant_id THEN
  RETURN QUERY SELECT false, 'Invalid tenant', false, false, 0;
  RETURN;
END IF;
```

---

### Issue 3: No Geographic Tracking ⚠️

**Current:**
```
Only checks: email, IP, tenant
Missing: Location, device, geolocation
```

**Missing Checks:**
- Country-based restrictions
- Impossible travel (login from 2 locations within minutes)
- New device detection
- Unusual time-of-day login
- VPN/Proxy detection

**Proposals:**

**3A - Geographic Consistency:**
```sql
-- Add geolocation check
SELECT last_login_country, last_login_at 
INTO v_last_country, v_last_login_at
FROM public.user_login_history
WHERE user_id = v_user_id
ORDER BY last_login_at DESC
LIMIT 1;

-- Check for impossible travel
IF v_last_login_at > NOW() - INTERVAL '15 minutes' THEN
  -- Impossible travel detected (different country in 15 min)
  RETURN QUERY SELECT true, NULL, true, false, 0; -- Force MFA
END IF;
```

**3B - Unusual Activity Detection:**
```sql
-- Check time-of-day consistency
v_typical_login_hour := (
  SELECT EXTRACT(HOUR FROM login_time)
  FROM user_login_history
  WHERE user_id = v_user_id
  GROUP BY EXTRACT(HOUR FROM login_time)
  ORDER BY COUNT(*) DESC
  LIMIT 1
);

IF ABS(EXTRACT(HOUR FROM NOW()) - v_typical_login_hour) > 8 THEN
  -- Unusual login hour - might want to require MFA
  v_unusual_activity := true;
END IF;
```

**Priority:** Medium (Nice-to-have)

---

### Issue 4: No Rate Limiting Context ⚠️

**Current:**
```
IP blocking: 20 failed attempts per 24h
Missing: Progressive delays (exponential backoff)
```

**Proposal 4:**

```sql
-- Add progressive delays
-- 1st failed: 0 delay
-- 2nd failed: 1 second
-- 3rd failed: 2 seconds
-- 4th failed: 4 seconds
-- 5th failed: 8 seconds
-- (exponential backoff)

v_suggested_delay_seconds := POWER(2, v_failed_attempts - 1);

RETURN QUERY SELECT 
  true,
  NULL,
  false,
  false,
  v_suggested_delay_seconds;  -- Return as remaining_attempts field
```

**Note:** Backend should implement the actual delay

**Priority:** Low (Nice-to-have)

---

### Issue 5: No Logging of Security Checks ⚠️

**Current:**
```
Function executes silently
No audit trail of who called it, when, why
```

**Risk:** 
- Can't investigate security incidents
- No anomaly detection
- No compliance audit trail

**Proposal 5:**

```sql
-- Create audit log on each call
INSERT INTO security_check_logs (
  email_hash,
  ip_address,
  tenant_id,
  allowed,
  reason,
  checked_at
) VALUES (
  MD5(p_email),  -- Hash for privacy
  p_ip_address,
  p_tenant_id,
  v_allowed,
  v_reason,
  NOW()
);
```

**Priority:** High (Security audit requirement)

---

### Issue 6: No Return Code for "Try Again Later" ⚠️

**Current:**
```
Only returns: blocked or allowed
Missing: "Rate limited - wait X seconds"
```

**Proposal 6:**

```sql
-- Add status code instead of just allowed/blocked
RETURNS TABLE(
  status_code INT,  -- 0=allowed, 1=mfa_required, 2=rate_limited, 3=blocked
  reason TEXT,
  wait_seconds INT,
  mfa_required BOOLEAN,
  remaining_attempts INT
)
```

**Priority:** Medium

---

### Issue 7: Complex Logic in DB (Hard to Test) ⚠️

**Current:**
```
All logic in PostgreSQL function
Hard to unit test
Hard to version control
Difficult to debug
```

**Proposal 7A - Move to Backend:**

```typescript
// server/utils/login-security-checker.ts
export async function checkLoginSecurity(
  email: string,
  ipAddress: string,
  tenantId: string
): Promise<SecurityCheckResult> {
  
  // 1. Check account lockout
  const accountStatus = await checkAccountLockout(email, tenantId);
  if (accountStatus.locked) return { allowed: false, reason: 'Account locked' };
  
  // 2. Check IP blocking
  const ipStatus = await checkIPBlockingStatus(ipAddress);
  if (ipStatus.blocked) return { allowed: false, reason: 'IP blocked' };
  
  // 3. Check MFA requirement
  const mfaStatus = await checkMFARequirement(email, tenantId);
  if (mfaStatus.required) return { allowed: true, requiresMFA: true };
  
  // 4. Check failed attempts
  const attemptStatus = await checkFailedAttempts(email, tenantId);
  if (attemptStatus.exceeds) return { allowed: true, requiresMFA: true };
  
  return { allowed: true, requiresMFA: false };
}
```

**Benefits:**
- ✅ Unit testable
- ✅ Version controlled
- ✅ Debuggable
- ✅ Can use external APIs (geolocation, threat intelligence)
- ✅ Easier to extend

**Trade-off:** Slight performance hit (N+1 queries instead of 1 function call)

**Priority:** Medium (Refactoring)

---

### Issue 8: No External Threat Intelligence ⚠️

**Current:**
```
Only internal checks
Missing: IP reputation, geolocation databases
```

**Proposal 8:**

```sql
-- Check IP reputation (MaxMind, etc.)
-- Check if IP is known VPN/Proxy
-- Check if country is high-risk

v_ip_reputation := (
  SELECT reputation_score
  FROM ip_reputation_cache
  WHERE ip_address = p_ip_address
    AND cached_at > NOW() - INTERVAL '7 days'
);

IF v_ip_reputation < 20 THEN  -- Low score = suspicious
  RETURN QUERY SELECT true, NULL, true, false, 0; -- Force MFA
END IF;
```

**External Services:**
- MaxMind GeoIP2
- AbusedIPDB
- Cloudflare Threat API
- AWS WAF IP reputation

**Priority:** Low (Enhancement)

---

## Summary Table

| Issue | Current | Recommendation | Priority | Effort |
|-------|---------|---|----------|--------|
| 1. SECURITY DEFINER Risk | ⚠️ High Risk | Use SECURITY INVOKER | **CRITICAL** | Low |
| 2. No Tenant Isolation | ⚠️ Missing | Add tenant validation | **CRITICAL** | Low |
| 3. No Geographic Tracking | ⚠️ Missing | Add country/impossible travel check | Medium | Medium |
| 4. No Progressive Backoff | ⚠️ Missing | Add exponential delay suggestion | Low | Low |
| 5. No Security Logging | ⚠️ Missing | Log all security checks | **HIGH** | Medium |
| 6. No Rate Limit Response | ⚠️ Missing | Add status codes + wait time | Medium | Low |
| 7. Complex DB Logic | ⚠️ Hard to Test | Move to backend TypeScript | Medium | High |
| 8. No Threat Intelligence | ⚠️ Missing | Integrate external IP reputation | Low | High |

---

## Quick Fix (5 minutes) 🚀

```sql
-- Change from SECURITY DEFINER to SECURITY INVOKER
ALTER FUNCTION public.check_login_security_status(
  VARCHAR, VARCHAR, UUID
) SECURITY INVOKER;

-- Add tenant validation
-- (already in code, just needs verification)
```

---

## Medium Improvements (1-2 hours) ⏱️

1. Remove SECURITY DEFINER completely
2. Add security audit logging
3. Add tenant isolation validation
4. Add status codes (blocked/rate-limited/allowed/mfa-required)

---

## Long-term Refactoring (4-8 hours) 🔧

Move security check logic from PostgreSQL to backend TypeScript:
- Easier to test
- Easier to integrate external APIs
- Better error handling
- Version controlled

---

## Compliance & Security

| Compliance | Status | Gap |
|-----------|--------|-----|
| GDPR | ✅ | - |
| SOC2 | ⚠️ | Missing: Audit logging |
| PCI DSS | ✅ | - |
| ISO27001 | ⚠️ | Missing: Threat intelligence |

---

## Recommendations by Risk

### 🔴 CRITICAL (Do immediately)
1. Remove `SECURITY DEFINER` - Use `SECURITY INVOKER` instead
2. Add tenant isolation validation
3. Log all security checks

### 🟠 HIGH (Do soon)
4. Add status codes (not just allowed/blocked)
5. Implement audit logging for compliance
6. Add rate-limit response codes

### 🟡 MEDIUM (Do later)
7. Move logic to backend for testability
8. Add geographic tracking
9. Add progressive backoff delays

### 🟢 LOW (Nice-to-have)
10. Integrate external threat intelligence
11. Add device fingerprinting
12. Add unusual activity detection

---

## Test Plan

```typescript
// Unit tests needed:
test('blocks account when locked', () => {});
test('blocks IP after 20 failed attempts', () => {});
test('requires MFA after 5 failed attempts', () => {});
test('prevents tenant A from checking tenant B', () => {});
test('logs all security checks', () => {});
test('returns appropriate status codes', () => {});
```

