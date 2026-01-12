# Direct Database Queries Audit - Frontend

## Status: IN PROGRESS - Customer Dashboard 9/10 Secure! 🎉

Last Updated: January 12, 2026

---

## COMPLETED MIGRATIONS ✅

### 1. **StudentSelector.ts** - Student Loading
**Previous Direct Query:** `supabase.from('users').select(...)`
**Status:** ✅ **MIGRATED** to `/api/admin/get-students.get.ts`

- Now uses secure API endpoint with:
  - Authentication + Authorization (staff/admin roles)
  - Rate limiting
  - Tenant isolation
  - Audit logging
  - Filters students: assigned staff, appointment history, excludes staff themselves

---

### 2. **Calendar/Reglements Loading** - Tenant Regulations
**Previous Direct Queries:** 
- `supabase.from('tenant_reglements').select(...)`
- `supabase.from('reglement_sections').select(...)`

**Status:** ✅ **MIGRATED** to:
- `/api/onboarding/reglements.get.ts` (for onboarding users)
- `/api/customer/reglements.get.ts` (for authenticated customers)

**Used By:**
- `pages/onboarding/[token].vue` - During self-registration
- `pages/customer/reglemente/[type].vue` - Customer dashboard
- `components/customer/CustomerDashboard.vue` - Reglement modal

---

### 3. **Customer Appointments** - Get Appointments & Payments
**Previous Direct Query:** Multiple queries from dashboard
**Status:** ✅ **MIGRATED** to `/api/customer/get-appointments.get.ts`

**Features:**
- Fetches appointments with related payments
- Tenant-isolated
- Rate limited
- Audit logged

---

### 4. **Customer Pending Confirmations**
**Previous Direct Query:** Manual appointment + payment loading
**Status:** ✅ **MIGRATED** to `/api/customer/get-pending-confirmations.get.ts`

---

### 5. **Customer Payments List**
**Previous Direct Query:** Payment table queries
**Status:** ✅ **MIGRATED** to `/api/customer/get-payments.get.ts`

---

### 6. **Product Sales Dashboard** - Admin Sales Analytics
**Previous Direct Queries:** 
- `supabase.from('payments').select(...)`
- `supabase.from('users').select(...)`
- `supabase.from('payment_items').select(...)`

**Status:** ✅ **MIGRATED** to `/api/admin/get-product-sales.get.ts`
**Date:** January 11, 2026

**Features:**
- Fetches direct sales, anonymous sales, and shop sales
- Includes tenant branding information
- Admin-only with tenant isolation
- Rate limited and audit logged

---

### 7. **Learning Progress** - Customer Evaluation Data
**Previous Direct Queries:** 
- `supabase.from('users').select('category')`
- `supabase.from('appointments').select(...)`
- `supabase.from('evaluation_scale').select(...)`
- `supabase.from('notes').select(...)`
- `supabase.from('evaluation_categories').select(...)`
- `supabase.from('evaluation_criteria').select(...)`

**Status:** ✅ **MIGRATED** to `/api/customer/get-learning-progress.get.ts`
**Date:** January 11, 2026

**Features:**
- Consolidated 6 separate queries into 1 API call
- Server-side progress calculation
- Customer-only with strict tenant isolation
- Rate limited and audit logged

---

### 8. **Customer Payment Processing** - Credit & Wallee Payments
**Previous Direct Queries:** 
- `supabase.from('payments').update(...)`
- `supabase.from('student_credits').select/update(...)`
- Direct Wallee API calls from frontend

**Status:** ✅ **MIGRATED** to `/api/payments/process.post.ts`
**Date:** January 10-12, 2026

**Features:**
- Integrated credit payment logic (check, deduct, mark paid)
- Wallee payment processing with tokenization (FORCE mode)
- Webhook rollback for failed payments (credit refunds)
- Credit transaction tracking in `credit_transactions` table
- Comprehensive audit logging

---

### 9. **Tenant Branding** - XSS & Information Disclosure Fix 🔒
**Previous Direct Queries:** 
- `supabase.from('tenants').select('*')` (Anonymous SELECT!)

**Status:** ✅ **MIGRATED** to `/api/tenants/branding.get.ts` & `.post.ts`
**Date:** January 12, 2026

**CRITICAL SECURITY FIXES:**
1. **Information Disclosure:**
   - RLS policy `tenants_anonymous_select` allowed anonymous access to ALL tenant data
   - Including: `wallee_secret_key`, internal settings, etc.
   
2. **XSS Vulnerability:**
   - `custom_css` and `custom_js` were returned unsanitized
   - Potential for persistent XSS attacks
   
3. **No Authorization:**
   - Anyone could read/update tenant branding

**New Security:**
- Field filtering (only safe/public fields for anonymous)
- Custom CSS/JS sanitized (only for admins)
- Rate limiting (30/min IP, 120/min user)
- Audit logging for all access
- Admin-only updates with tenant isolation

**Affected Composable:** `composables/useTenantBranding.ts` - fully refactored

---

### 10. **Tenant Logo Loading** - useLoadingLogo Composable
**Previous Direct Queries:** 
- `supabase.from('tenants').select(logo fields)` (by ID)
- `supabase.from('tenants').select(logo fields)` (by slug)

**Status:** ✅ **MIGRATED** to `/api/tenants/branding.get.ts`
**Date:** January 12, 2026

**Changes:**
- `getTenantLogo()` → uses branding API
- `getTenantLogoBySlug()` → uses branding API
- `loadCurrentTenantLogo()` → uses auth store instead of direct query

---

### 11. **Tenant Loading** - useTenant Composable
**Previous Direct Query:** 
- `supabase.from('tenants').select('*')` (by slug/domain)

**Status:** ✅ **MIGRATED** to `/api/tenants/branding.get.ts`
**Date:** January 12, 2026

**Changes:**
- `loadTenant()` → uses branding API
- `getAllTenants()` → @deprecated (not used anywhere)

---

### 12. **Customer Dashboard** - Tenant Info & Dead Code
**Previous Direct Queries:** 
- `supabase.from('tenants').select('*')` - Tenant data loading
- `supabase.from('users').select('id')` - Payment method check
- `supabase.from('customer_payment_methods').select(...)` - Payment method check

**Status:** ✅ **MIGRATED & CLEANED UP**
**Date:** January 12, 2026

**Changes:**
1. Tenant loading → uses `useTenantBranding` composable (secure API)
2. Payment method check → **DEAD CODE REMOVED** (37 lines)
   - `checkPaymentMethod()` was never used in template
   - Payment methods loaded on-demand via Wallee
3. Duplicate notes query → Fixed (see #13)

---

### 13. **Customer Dashboard Notes/Evaluations** - Duplicate Query Fix
**Previous Issue:** 
- API loaded appointments WITH notes (but incomplete fields)
- Frontend loaded notes AGAIN (separate query)
- Result: 0 evaluations displayed (duplicate work, missing data)

**Status:** ✅ **FIXED**
**Date:** January 12, 2026

**Changes:**
1. **API Extended:** `/api/customer/get-appointments.get.ts`
   - Now includes: `evaluation_criteria_id`, `criteria_rating`, `criteria_note`, `created_at`
   
2. **Frontend Optimized:** `CustomerDashboard.vue`
   - Extracts evaluations from API response (no duplicate query)
   - Eliminates 1 direct `.from('notes')` query
   
**Result:** Notes/Evaluations now display correctly! ✨

---

## ACTIVE DIRECT QUERIES (Still need migration)

### CUSTOMER DASHBOARD - REMAINING QUERIES 🟢 LOW RISK

#### **locations** - Location Data
**Current Query:** `supabase.from('locations').select(...).in('id', locationIds)`
**Risk Level:** 🟢 **LOW** 
- Has RLS + Tenant Isolation ✅
- Only loads locations for user's own appointments ✅
- Read-only query ✅

**Action:** Nice-to-have - could migrate to include in appointments API response

---

#### **evaluation_criteria** - Criteria Names
**Current Query:** `supabase.from('evaluation_criteria').select('id, name').in('id', criteriaIds)`
**Risk Level:** 🟢 **LOW** 
- Public reference data ✅
- Has RLS ✅
- Read-only ✅

**Action:** Nice-to-have - could include in learning progress API

---

### PRIORITY 1: CRITICAL (Admin Pages)

#### 3. **usePendencies.ts** - Pendency Loading
**Location:** `composables/usePendencies.ts` (Lines 70-82)

**Current Query:**
```typescript
supabase.from('pendencies')
  .select('*')
  .eq('tenant_id', tenantId)
  .is('deleted_at', null)
  .order('due_date', { ascending: true })
```

**Risk Level:** 🟡 **MEDIUM** - No pagination, appears unused currently
**Used By:** Unknown - needs verification
**Status:** Contains debug logs, should clean up

**Action:** Either migrate to API or remove if unused

---

#### 4. **useInvoices.ts** - Invoice Data
**Location:** `composables/useInvoices.ts` (Line numbers in search)

**Risk Level:** 🟡 **MEDIUM** - Direct DB access
**Used By:** Invoice pages

**Action:** Should migrate to `/api/invoices/get.get.ts`

---

### PRIORITY 2: ADMIN PAGES (Lower Risk)

#### 5. **tenant-admin/index.vue** - Dashboard Stats
**Location:** `pages/tenant-admin/index.vue` (Lines 320-353)

**Current Queries:**
```typescript
supabase.from('tenants').select('id, is_active, is_trial')
supabase.from('users').select('id, auth_user_id, tenant_id, role')
```

**Risk Level:** 🟢 **LOW** - Tenant admin only
**Action:** Nice-to-have migration to `/api/tenant-admin/get-stats.get.ts`

---

#### 6. **exam-statistics.vue** - Exam Data
**Location:** `pages/admin/exam-statistics.vue` (Lines 592-667)

**Risk Level:** 🟢 **LOW** - Admin only
**Action:** Can migrate to `/api/admin/get-exam-stats.get.ts`

---

#### 5. **tenant-admin/index.vue** - Dashboard Stats
**Location:** `pages/tenant-admin/index.vue` (Lines 320-353)

**Current Queries:**
```typescript
supabase.from('tenants').select('id, is_active, is_trial')
supabase.from('users').select('id, auth_user_id, tenant_id, role')
```

**Risk Level:** 🟢 **LOW** - Tenant admin only
**Action:** Nice-to-have migration to `/api/tenant-admin/get-stats.get.ts`

---

#### 6. **exam-statistics.vue** - Exam Data
**Location:** `pages/admin/exam-statistics.vue` (Lines 592-667)

**Risk Level:** 🟢 **LOW** - Admin only
**Action:** Can migrate to `/api/admin/get-exam-stats.get.ts`

---

#### 7. **admin/courses.vue** - Course Management (~32 queries)
**Location:** `pages/admin/courses.vue`

**Risk Level:** 🟡 **MEDIUM** - Admin only, but MANY queries
**Impact:** Course management page with extensive DB interactions
**Action:** Should consolidate into `/api/admin/courses/*` endpoints

---

#### 8. **admin/index.vue** - Dashboard (~30 queries)
**Location:** `pages/admin/index.vue`

**Risk Level:** 🟡 **MEDIUM** - Admin only, but MANY queries
**Impact:** Main admin dashboard with stats and overview
**Action:** Should consolidate into `/api/admin/dashboard.get.ts`

---

## RECENT FIXES & IMPROVEMENTS 🔧

### Database Migrations

#### **audit_logs** - Allow NULL user_id for Anonymous Actions
**Date:** January 12, 2026
**Migration:** `migrations/fix_audit_logs_allow_null_user_id.sql`

**Problem:**
- Anonymous requests (e.g., tenant branding after logout) failed with:
  `"null value in column user_id violates not-null constraint"`

**Solution:**
1. `ALTER COLUMN user_id DROP NOT NULL` - Allow anonymous audit logs
2. Added constraint: `audit_logs_has_identifier`
   - Ensures at least ONE identifier: `user_id OR auth_user_id OR ip_address`

**Result:**
- Anonymous actions now tracked via IP address ✅
- No audit logging errors ✅

---

## KNOWN ISSUES TO FIX

### Debug Logs in Composables
**`usePendencies.ts`:** Contains multiple `console.log()` debug statements
- Should be removed or replaced with proper `logger.debug()`

---

## RECOMMENDATION FOR MIGRATION ORDER

### ✅ Phase 1 (January 10-12, 2026) - COMPLETED!
1. ✅ **StudentSelector** - Migrated to `/api/admin/get-students`
2. ✅ **Reglements Loading** - Migrated to `/api/customer/reglements` & `/api/onboarding/reglements`
3. ✅ **Customer Appointments** - Migrated to `/api/customer/get-appointments`
4. ✅ **Customer Payments** - Migrated to `/api/customer/get-payments`
5. ✅ **product-sales.vue** - Migrated to `/api/admin/get-product-sales`
6. ✅ **learning.vue** - Migrated to `/api/customer/get-learning-progress`
7. ✅ **customer/payments.vue** - Migrated to `/api/payments/process`
8. ✅ **useTenantBranding** - CRITICAL SECURITY FIX - Migrated to `/api/tenants/branding`
9. ✅ **useLoadingLogo** - Migrated to `/api/tenants/branding`
10. ✅ **useTenant** - Migrated to `/api/tenants/branding`
11. ✅ **CustomerDashboard** - Dead code removed, notes fixed

**Result:** Customer Dashboard is now **9/10 SECURE!** 🎉

### Phase 2 (Next) - Admin Consolidation
12. **admin/courses.vue** → Consolidate ~32 queries into `/api/admin/courses/*`
13. **admin/index.vue** → Consolidate ~30 queries into `/api/admin/dashboard.get.ts`
14. **useInvoices.ts** → Migrate to `/api/invoices/get.get.ts`

### Phase 3 (Future) - Cleanup & Nice-to-Haves
15. **usePendencies.ts** → Verify usage, migrate or remove
16. **tenant-admin/index.vue** → `/api/tenant-admin/get-stats.get.ts`
17. **exam-statistics.vue** → `/api/admin/get-exam-stats.get.ts`
18. **CustomerDashboard locations** → Include in appointments API
19. **CustomerDashboard criteria** → Include in learning progress API

---

## SECURITY LAYERS FOR ALL NEW APIs

Every migrated API must have:
- ✅ **Authentication** - User must be logged in
- ✅ **Authorization** - Check user role (staff/admin/customer)
- ✅ **Rate Limiting** - 60-120 req/min per user
- ✅ **Tenant Isolation** - User can only see own tenant data
- ✅ **Input Validation** - Validate query parameters
- ✅ **Audit Logging** - Log all data access
- ✅ **Pagination** - For large result sets (limit 100-1000)
- ✅ **Error Handling** - Safe error messages (no data leaks)

---

## Current State Summary

| Layer | Status | Count | Risk |
|-------|--------|-------|------|
| **Composables** | Mostly migrated | 1-2 remain | 🟡 MEDIUM |
| **Customer Pages** | ✅ Mostly done | 1 remain | 🟡 MEDIUM |
| **Admin Pages** | In progress | 5+ remain | 🟢 LOW |
| **Core Functionality** | ✅ Secured | - | ✅ GREEN |

---

## Technical Debt
- Remove debug console.log() from `usePendencies.ts`
- Verify if `usePendencies.ts` is actually used
- Check if `useInvoices.ts` is still in active use

