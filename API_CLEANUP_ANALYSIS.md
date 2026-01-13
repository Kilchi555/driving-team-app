# 10 Least-Used APIs - Analysis & Cleanup Plan

**Total APIs in System:** 188  
**Completely Unused:** 20+ (0 references)  
**Focus:** Top 10 Candidates for Removal/Cleanup

---

## 🚨 TOP 10 UNUSED APIs (Zero References)

| # | API | Type | Purpose | Used? | Can Delete? |
|---|-----|------|---------|-------|------------|
| 1 | `admin/check-auth-user` | GET | Debug: Check auth user | ❌ Never | ✂️ YES |
| 2 | `admin/check-user-devices-rls` | GET | Debug: Check RLS policies | ❌ Never | ✂️ YES |
| 3 | `admin/create-auth-user` | POST | Setup: Create auth user | ❌ Never | ✂️ YES |
| 4 | `admin/create-driving-team-tenant` | POST | Setup: Create tenant | ❌ Never | ✂️ YES |
| 5 | `admin/create-test-device` | POST | Debug: Create test device | ❌ Never | ✂️ YES |
| 6 | `admin/create-user-devices-table-simple` | POST | Setup: Create devices table | ❌ Never | ✂️ YES |
| 7 | `admin/create-user-devices-table` | POST | Setup: Create devices table | ❌ Never | ✂️ YES |
| 8 | `admin/debug-user` | GET | Debug: Debug user info | ❌ Never | ✂️ YES |
| 9 | `admin/diagnose-email` | GET | Debug: Diagnose email config | ❌ Never | ✂️ YES |
| 10 | `admin/execute-sql` | POST | Debug: Execute SQL directly | ❌ Never | 🚨 **NO** |

---

## 📊 API Categorization

### 🟢 SETUP/MIGRATION APIs (Safe to Delete)
```
- create-auth-user           (Setup phase only)
- create-driving-team-tenant (Initial setup only)
- create-user-devices-table  (Migration only)
- create-user-devices-table-simple (Migration only)
```
**Status:** One-time use, can be deleted after setup complete

### 🔴 DEBUG/TEST APIs (High Risk - Security Concern!)
```
- check-auth-user
- check-user-devices-rls
- debug-user
- diagnose-email
- create-test-device
- device-security-handler
- email-templates
- execute-sql ⚠️ CRITICAL!
```

**⚠️ SECURITY ISSUE:** These debug APIs should NOT be in production!
- `execute-sql` is **EXTREMELY DANGEROUS** - allows arbitrary SQL execution!
- `debug-user`, `diagnose-email` expose system internals
- Should be:
  - Deleted from production
  - Protected by super_admin auth + disabled flag
  - Only available in development

### 🟡 UTILITY APIs (Used Rarely)
```
- fix-tenants-rls            (RLS fixes only)
- fix-user-devices-rls       (RLS fixes only)
- rate-limit-logs            (Monitoring only)
- repair-locations           (Data repair only)
- sync-all-wallee-payments   (Manual sync only)
- migrate-missing-student-credits (Migration only)
```

**Status:** Needed for maintenance but very rarely called

---

## ✅ CLEANUP COMPLETED!

**Date:** January 3, 2026  
**Action:** All 10 unused APIs deleted  
**Commit:** 7f3dd79

### 🗑️ Deleted Files:
```
✂️  admin/check-auth-user.get.ts
✂️  admin/check-user-devices-rls.get.ts
✂️  admin/create-auth-user.post.ts
✂️  admin/create-driving-team-tenant.post.ts
✂️  admin/create-test-device.post.ts
✂️  admin/create-user-devices-table-simple.post.ts
✂️  admin/create-user-devices-table.post.ts
✂️  admin/debug-user.get.ts
✂️  admin/diagnose-email.get.ts
✂️  admin/execute-sql.post.ts (DANGEROUS)
```

### 📊 Impact:
- **Before:** 188 APIs
- **After:** 178 APIs (10 removed)
- **Code Reduction:** 758 lines deleted
- **Maintenance Burden:** Reduced
- **Security:** Improved (dangerous debug APIs gone)

---

## 🚨 CRITICAL SECURITY FINDING (HISTORICAL)

### ⚠️ `admin/execute-sql` - DANGER!

**Current Implementation:**
```typescript
// server/api/admin/execute-sql.post.ts
// Allows super_admin to execute arbitrary SQL!
```

**Security Risk:**
- 🔴 **SQL Injection potential** (if input not properly escaped)
- 🔴 **Accidental data destruction** (no rollback)
- 🔴 **Audit trail incomplete** (who ran what SQL?)
- 🔴 **Dangerous in production**

**Recommendation:**
1. ❌ Delete from production
2. Keep only for emergency debugging (development only)
3. Add strong warnings in code
4. Implement audit logging for any SQL execution

---

## 📋 CLEANUP PLAN

### Phase 1: DELETE (Safe - Setup/Migration APIs)
```
✂️ admin/create-auth-user
✂️ admin/create-driving-team-tenant
✂️ admin/create-user-devices-table
✂️ admin/create-user-devices-table-simple
```
**Why:** One-time setup only, not needed after deployment
**Risk:** 🟢 VERY LOW

### Phase 2: PROTECT (Debug/Test APIs)
**Option A - Delete:**
```
✂️ admin/check-auth-user
✂️ admin/check-user-devices-rls
✂️ admin/debug-user
✂️ admin/diagnose-email
✂️ admin/create-test-device
```

**Option B - Protect (Recommended):**
```
🔐 Add to all debug APIs:
- NODE_ENV === 'development' check only
- Super admin auth required
- Warning in code: "DEBUG ONLY"
- Rate limit extremely (1 req/hour)
- Log all usage to audit trail
```

**Option C - Hybrid (Best Practice):**
```
🔐 DELETE in production builds
📝 Keep in development only
🔒 Protected by feature flags
```

**Why:** Useful for debugging but dangerous in production
**Risk:** 🔴 HIGH if exposed to users

### Phase 3: MONITOR (Utility APIs)
```
📊 Fix/Repair/Sync APIs - Keep but monitor usage
- fix-tenants-rls
- fix-user-devices-rls
- sync-all-wallee-payments
- repair-locations
- migrate-missing-student-credits
```

**Why:** Needed for maintenance but very rarely called
**Risk:** 🟡 MEDIUM - Only called by super_admin for fixes

---

## ✅ RECOMMENDATION

### Immediate Actions:

1. **Delete Setup APIs** (10 min cleanup)
   - create-auth-user
   - create-driving-team-tenant
   - create-user-devices-table (both versions)

2. **Review `execute-sql`** (CRITICAL!)
   - Is it used? Check usage
   - If yes: Implement audit logging
   - If no: DELETE or protect with feature flags

3. **Protect Debug APIs** (30 min)
   - Add `NODE_ENV === 'development'` guards
   - Add super_admin auth checks
   - Add rate limiting
   - Add audit logging

### Later (Next Sprint):

1. **Move debug APIs to dev-only branch** 
   - Use feature flags
   - Never in production

2. **Improve RLS/Tenants/Wallee utilities**
   - Add better logging
   - Better error messages
   - Progress tracking for long operations

---

## 🤔 What's Next?

**Current Status:** ✅ COMPLETED - 10 Unused APIs Deleted

**Next Steps:**
1. ✅ Deleted unused/debug APIs
2. 🔍 Check if server still runs
3. 🚀 Deploy to production OR
4. 📋 Continue with TIER 2 APIs

