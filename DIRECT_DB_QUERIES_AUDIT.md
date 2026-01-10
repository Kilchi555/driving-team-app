# Direct Database Queries Audit - Frontend

## Status: IN PROGRESS - Migration underway

Last Updated: January 10, 2025

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

## ACTIVE DIRECT QUERIES (Still need migration)

### PRIORITY 1: CRITICAL (Core Functionality)

#### 1. **product-sales.vue** - Sales Dashboard (Admin Only)
**Location:** `pages/admin/product-sales.vue` (Lines 570-612)

**Current Queries:**
```typescript
supabase.from('payments').select(...)
  .eq('tenant_id', tenantId)
  .order('created_at', { ascending: false })

supabase.from('users').select(...)
  .in('id', directUserIds)

supabase.from('payment_items').select(...)
  .in('payment_id', directPaymentIds)
  .eq('item_type', 'product')
```

**Risk Level:** 🟡 **MEDIUM** - Admin only but no rate limiting
**Impact:** Sales analytics page (admin-only)

**Action:** Should migrate to `/api/admin/get-product-sales.get.ts`

---

#### 2. **customer/payments.vue** - Customer Payment Actions (Customer-Facing)
**Location:** `pages/customer/payments.vue` (Lines 710-720, 813+)

**Current Queries:**
```typescript
// UPDATE: Mark payment as completed with credit
supabase.from('payments')
  .update({ payment_status: 'completed', credit_used_rappen, ... })
  .eq('id', payment.id)

// Likely other direct queries on lines 813+
```

**Risk Level:** 🔴 **HIGH** - Customer-facing, data modification
**Impact:** Customer paying with credit - directly updates database
**Security Risk:** Customer could bypass audit logging

**Action:** URGENT - Migrate to `/api/payments/pay-with-credit.post.ts`

---

#### 3. **learning.vue** - Evaluation Data
**Location:** `pages/learning.vue` (Lines 267-312)

**Current Queries:**
```typescript
supabase.from('users').select('category')
  .eq('id', currentUserId)

supabase.from('appointments').select('id, type')
  .eq('user_id', currentUserId)

supabase.from('evaluation_scale').select(...)
```

**Risk Level:** 🟡 **MEDIUM** - Customer-facing but limited impact
**Impact:** Evaluation tracking for customer

**Action:** Should migrate to `/api/customer/get-learning-progress.get.ts`

---

### PRIORITY 2: HIGH-USE COMPOSABLES

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

### PRIORITY 3: ADMIN PAGES (Lower Risk)

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

## KNOWN ISSUES TO FIX

### Debug Logs in Composables
**`usePendencies.ts`:** Contains multiple `console.log()` debug statements
- Should be removed or replaced with proper `logger.debug()`

---

## RECOMMENDATION FOR MIGRATION ORDER

### Phase 1 (This Week) - Critical
1. ✅ **StudentSelector** - DONE
2. ✅ **Reglements Loading** - DONE  
3. ✅ **Customer Appointments** - DONE
4. ✅ **Customer Payments** - DONE
5. ⏳ **product-sales.vue** → `/api/admin/get-product-sales.get.ts`

### Phase 2 (Next Week) - High-Use
6. **learning.vue** → `/api/customer/get-learning-progress.get.ts`
7. **useInvoices.ts** → `/api/invoices/get.get.ts`

### Phase 3 (Following Week) - Admin Pages
8. **usePendencies.ts** → Verify usage, then migrate or remove
9. **tenant-admin/index.vue** → `/api/tenant-admin/get-stats.get.ts`
10. **exam-statistics.vue** → `/api/admin/get-exam-stats.get.ts`

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

