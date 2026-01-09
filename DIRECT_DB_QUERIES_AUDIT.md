# Direct Database Queries Audit - Frontend

## Status: CRITICAL - Multiple unsecured direct queries found

---

## PRIORITY 1: ACTIVE USE (Must Migrate)

### 1. **usePricing.ts** - Pricing Rules & Categories
**Location:** `composables/usePricing.ts` (Lines 195-210, 365, 758)

**Queries:**
```typescript
// 1. Load pricing_rules from DB
await supabase.from('pricing_rules')
  .select('*')
  .eq('tenant_id', tenantId)
  .eq('is_active', true)

// 2. Fallback: Categories lookup
await supabase.from('categories')
  .select('*')
  .eq('code', categoryCode)
```

**Used By:**
- `EventModal.vue` - Price calculation when creating appointments
- `components/CalendarComponent.vue` - Event color loading

**Risk Level:** 🔴 **HIGH** - Core pricing logic, multiple queries per form action

**Why:** Multiple queries per user interaction, no rate limiting, no audit logging

---

### 2. **usePendencies.ts** - Pendencies Loading
**Location:** `composables/usePendencies.ts` (Lines 70-82)

**Query:**
```typescript
const { data, error: err } = await supabase
  .from('pendencies')
  .select('*')
  .eq('tenant_id', tenantId)
  .is('deleted_at', null)
  .order('due_date', { ascending: true })
```

**Used By:**
- Unknown (needs verification)

**Risk Level:** 🟡 **MEDIUM** - No pagination, no rate limiting

---

### 3. **useUsers.ts** - User List Loading
**Location:** `composables/useUsers.ts` (Lines 71-104)

**Queries:**
```typescript
// getActiveUsers()
await supabase.from('users').select('*').eq('is_active', true)

// getAllUsers()
await supabase.from('users').select('*')

// getUserById(userId)
await supabase.from('users').select('*').eq('id', userId)
```

**Used By:**
- Unknown (needs verification)

**Risk Level:** 🟡 **MEDIUM** - No pagination for large user lists

---

## PRIORITY 2: HIGH-USE PAGES (Should Migrate)

### 4. **CustomersTab.vue** - Customer Loading
**Location:** `components/users/CustomersTab.vue` (Lines 399-424)

**Query:**
```typescript
const { data, error: supabaseError } = await supabase
  .from('users')
  .select(`id, email, first_name, last_name, phone, ...`)
  .eq('role', 'client')
  .eq('tenant_id', tenantId)
  .order('first_name', { ascending: true })
```

**Risk Level:** 🟡 **MEDIUM** - No pagination, no rate limiting

---

### 5. **product-sales.vue** - Sales Data
**Location:** `pages/admin/product-sales.vue` (Lines 570-585)

**Query:**
```typescript
const { data: directSalesData, error: directSalesError } = await supabase
  .from('payments')
  .select(`id, user_id, staff_id, total_amount_rappen, ...`)
  .eq('tenant_id', tenantId)
  .order('created_at', { ascending: false })
```

**Risk Level:** 🟡 **MEDIUM** - No pagination, admin only but still needs API protection

---

### 6. **useCurrentUser.ts** - Current User Lookup
**Location:** `composables/useCurrentUser.ts` (Lines 39-43)

**Query:**
```typescript
const { data: usersData, error: dbError } = await supabase
  .from('users')
  .select('*')
  .eq('email', user.email)
  .eq('is_active', true)
```

**Risk Level:** 🟢 **LOW-MEDIUM** - Only during app init, but could be optimized

---

## PRIORITY 3: PAGE-LEVEL QUERIES (Lower Priority)

### More than 50 pages have direct `.from()` queries:
- `pages/admin/` (10+ files)
- `pages/tenant-admin/` (5+ files)
- `pages/customer/` (5+ files)
- `pages/register/` (3+ files)
- Other pages (10+ files)

Most are in **admin/tenant-admin** pages which are lower risk but still should follow API pattern.

---

## RECOMMENDATION FOR MIGRATION ORDER

### Phase 1 (This Week) - Critical Core Functionality
1. ✅ **usePricing.ts** → `/api/pricing/calculate.post.ts`
   - Fix: Must load from `pricing_rules` table with conditional `admin_fee_applies_from` logic
   - Used constantly when editing appointments
   - High security impact

### Phase 2 (Next Week) - High-Use Components
2. **CustomersTab.vue** → `/api/admin/list-customers.get.ts`
3. **product-sales.vue** → `/api/admin/get-sales.get.ts`

### Phase 3 (Following Week) - Foundation Composables
4. **useUsers.ts** → `/api/admin/list-users.get.ts`
5. **usePendencies.ts** → `/api/admin/list-pendencies.get.ts`

### Phase 4 (Future) - Admin Pages
6. All remaining `pages/admin/`, `pages/tenant-admin/` → Individual APIs

---

## IMPLEMENTATION NOTES

### For usePricing Migration:
- ⚠️ **Business Logic Alert:** Admin fee is conditional:
  - Not applied for Motorcycle categories (A, A1, A35kW)
  - Applied from 2nd appointment onwards
  - Stored per-category in `pricing_rules.admin_fee_applies_from`
  
- Must NOT use hardcoded `5%` admin fee
- Must correctly implement appointment counting per student

### Security Requirements (All APIs):
- ✅ Authentication (user must be logged in)
- ✅ Rate limiting (60-120 req/min per user)
- ✅ Tenant isolation (user can only see own tenant)
- ✅ Audit logging
- ✅ Input validation
- ✅ Pagination (for large result sets)

---

## Current State Summary

| Layer | Status | Risk |
|-------|--------|------|
| **EventModal** | Uses `usePricing()` DB queries | 🔴 HIGH |
| **Admin Components** | Scattered direct queries | 🟡 MEDIUM |
| **Foundation Composables** | Direct DB access | 🟡 MEDIUM |
| **50+ Admin/Customer Pages** | Direct queries | 🟢 LOW |


