# Direct Database Queries on Admin Pages

## SCOPE: Admin-Only Pages (Protected by `middleware: 'admin'`)

All discovered pages have **`middleware: 'admin'`** which means:
✅ ONLY admins can access these pages
✅ Already protected at the router level
⚠️ But direct DB queries still bypass API security layers (rate limiting, audit logging, input validation)

---

## FOUND: 7+ Admin Pages with Direct Queries

### 1. **product-sales.vue** (CRITICAL - Multiple queries)
**Lines:** 549-612
**Queries:**
- `supabase.from('users').select().eq('auth_user_id', ...)`
- `supabase.from('tenants').select().eq('id', ...)`
- `supabase.from('payments').select().eq('tenant_id', ...)`
- `supabase.from('users').select().in('id', directUserIds)` ← Line 596 syntax error
- `supabase.from('payment_items').select().in('payment_id', ...)`

**Risk:** 🔴 HIGH - 5 queries, one with syntax error on line 596
**Action:** Use new `/api/admin/get-product-sales.get.ts`

---

### 2. **users/index.vue** (CRITICAL - Multiple queries)
**Lines:** 1125-1227
**Queries:**
- `supabase.from('users').select().eq('auth_user_id', ...)`
- `supabase.from('tenants').select().eq('id', ...)`
- `supabase.from('users').select().eq('tenant_id', ...)`
- `supabase.from('appointments').select().eq('tenant_id', ...)`
- `supabase.from('payments').select().eq('tenant_id', ...)` ← Line 1184 syntax error (.from missing)
- `supabase.from('staff_invitations').select().eq('tenant_id', ...)`

**Risk:** 🔴 HIGH - 6 queries, one with syntax error on line 1184
**Action:** Create `/api/admin/get-users-with-stats.get.ts`

---

### 3. **products.vue** (HIGH - Multiple queries)
**Lines:** 635-671
**Queries:**
- `supabase.from('users').select().eq('auth_user_id', ...)`
- `supabase.from('products').select().eq('tenant_id', ...)`

**Risk:** 🟡 MEDIUM - 2 queries, product management
**Action:** Create `/api/admin/get-products.get.ts`

---

### 4. **exam-statistics.vue**
**Status:** Needs inspection (result truncated)
**Risk:** 🟡 MEDIUM
**Action:** Inspect and plan migration

---

### 5. **courses.vue**
**Status:** Needs inspection (result truncated)
**Risk:** 🟡 MEDIUM
**Action:** Inspect and plan migration

---

### 6. **payment-reminders.vue**
**Status:** Needs inspection
**Risk:** 🟡 MEDIUM
**Action:** Inspect and plan migration

---

### 7. **cancellation-invoices.vue**
**Status:** Needs inspection
**Risk:** 🟡 MEDIUM
**Action:** Inspect and plan migration

---

### 8. **invoices.vue**
**Status:** Needs inspection
**Risk:** 🟡 MEDIUM
**Action:** Inspect and plan migration

---

### 9. **categories.vue**
**Status:** Needs inspection (result truncated with wrong line numbers)
**Risk:** 🟡 MEDIUM
**Action:** Inspect and plan migration

---

## SYNTAX ERRORS FOUND

### 1. **product-sales.vue Line 596**
```typescript
// ❌ BROKEN:
let directUsersData: any[] = []
if (directUserIds.length > 0) {
  
    .from('users')  // ← Missing: const { data, error: directUsersError } = await supabase
```

**Fix:** Line 595 is incomplete

### 2. **users/index.vue Line 1184**
```typescript
// ❌ BROKEN:
const { data: paymentsData, error: paymentsError } = await supabase
  
  .select(`
```

**Fix:** Missing `.from('payments')`

---

## PRIORITY MIGRATION ORDER

### Phase 1 (This Week) - Fix Syntax Errors + Create APIs
1. ✅ Create `/api/admin/get-product-sales.get.ts` (DONE)
2. ⏳ Fix syntax error in product-sales.vue line 596
3. ⏳ Fix syntax error in users/index.vue line 1184
4. Create `/api/admin/get-users-with-stats.get.ts`
5. Create `/api/admin/get-products.get.ts`

### Phase 2 (Next Week) - Inspect & Create APIs
6. Inspect exam-statistics.vue → Create API
7. Inspect courses.vue → Create API
8. Inspect payment-reminders.vue → Create API
9. Inspect cancellation-invoices.vue → Create API
10. Inspect invoices.vue → Create API
11. Inspect categories.vue → Create API

---

## Security Checklist for All New APIs
- ✅ Authentication check
- ✅ Authorization (admin/staff only)
- ✅ Rate limiting (120 req/min)
- ✅ Tenant isolation
- ✅ Input validation
- ✅ Pagination
- ✅ Audit logging
- ✅ Error handling


