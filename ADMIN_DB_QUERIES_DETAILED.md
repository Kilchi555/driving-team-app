# Admin Pages - Direct Database Queries Analysis

## 📊 Overview

**Total Admin Pages with DB Queries:** 19 files  
**Total Direct `.from()` Queries Found:** ~160+ queries  

---

## 🔴 TOP PRIORITY - Most Critical (30+ queries each)

### 1. **pages/admin/courses.vue** - 32 queries
**Tables Queried:**
- `courses` (multiple SELECT/INSERT/UPDATE)
- `course_sessions` (multi-level operations)
- `vehicles` (SELECT)
- `rooms` (SELECT)
- `course_registrations` (INSERT/SELECT)
- `course_notifications` (INSERT)
- `users` (SELECT)

**Operations:** Complex course management with sessions, registrations, vehicle/room bookings

**Risk:** 🔴 **CRITICAL** - Massive number of direct queries, potential for N+1 problems

---

### 2. **pages/admin/index.vue** - 30 queries
**Content:** Main admin dashboard with multiple sub-components
- Probably loads many different data sets (users, appointments, payments, etc.)

**Risk:** 🔴 **CRITICAL** - Dashboard page loaded on every admin login

---

### 3. **pages/admin/categories.vue** - 24 queries
**Tables Queried:**
- `categories` (CRUD operations)
- `pricing_rules` (likely)
- Related lookup tables

**Risk:** 🔴 **HIGH** - Pricing system page (affects all pricing calculations)

---

### 4. **pages/admin/profile.vue** - 15 queries
**Tables Queried:**
- `users`
- `tenant_settings` (multiple reads/writes)
- `tenants`
- `reminder_templates` (CRUD)

**Risk:** 🔴 **HIGH** - Profile/settings management, reads on almost every setting change

---

## 🟠 HIGH PRIORITY (10-15 queries)

### 5. **pages/admin/product-sales.vue** - 10 queries
**Tables:**
- `payments`
- `product_sales`
- `discount_sales`
- `users`

**Risk:** 🟡 **MEDIUM-HIGH** - Sales reporting page

---

### 6. **pages/admin/products.vue** - 8 queries
**Tables:**
- `products`
- Categories/pricing related

**Risk:** 🟡 **MEDIUM**

---

### 7. **pages/admin/discounts.vue** - 7 queries
**Tables:**
- `discounts`
- `discount_sales`

**Risk:** 🟡 **MEDIUM**

---

### 8. **pages/admin/exam-statistics.vue** - 7 queries
**Tables:**
- `appointments`
- `evaluations`
- `users`

**Risk:** 🟡 **MEDIUM** - Reporting/analytics

---

### 9. **pages/admin/examiners.vue** - 7 queries
**Tables:**
- `users` (examiners)
- Related lookups

**Risk:** 🟡 **MEDIUM**

---

### 10. **pages/admin/staff-hours.vue** - 6 queries
**Tables:**
- Staff time tracking related

**Risk:** 🟡 **MEDIUM**

---

## 🟡 MEDIUM PRIORITY (5-9 queries)

### 11. **pages/admin/cancellation-invoices.vue** - 5 queries
### 12. **pages/admin/student-credits.vue** - 4 queries
### 13. **pages/admin/cash-management.vue** - 3 queries
### 14. **pages/admin/discounts.vue** - 7 queries

---

## 🟢 LOW PRIORITY (1-3 queries)

### 15. **pages/admin/cash-management-fixed.vue** - 1 query
### 16. **pages/admin/data-management.vue** - 2 queries
### 17. **pages/admin/invoices.vue** - 2 queries
### 18. **pages/admin/payment-reminders.vue** - 2 queries
### 19. **pages/admin/medical-certificate-reviews.vue** - 1 query
### 20. **pages/admin/reminder-test.vue** - 1 query

---

## 📋 users/index.vue - Special Case
**Location:** `pages/admin/users/index.vue`

**Queries Found:**
- `users` table (multiple operations)
- `tenants` table
- `appointments` table
- `payments` table
- `staff_invitations` table
- `categories` table

**Risk:** 🔴 **CRITICAL** - User management hub, likely has many N+1 problems

---

## 🔍 Query Patterns Found

### Pattern 1: Repeated User Lookups
```typescript
// Found in multiple files:
const { data: user } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
```

### Pattern 2: No Pagination
```typescript
// Most pages load ALL records:
const { data } = await supabase
  .from('payments')
  .select('*')  // ❌ No limit/pagination
```

### Pattern 3: Multiple Queries in Loops
```typescript
// N+1 Problem - especially in courses.vue:
for (const course of courses) {
  const sessions = await supabase.from('course_sessions').select('*').eq('course_id', course.id)
  // ... more queries per item
}
```

### Pattern 4: No Rate Limiting
```typescript
// No rate limiting on any direct queries
// If admin loads these pages rapidly, potential DoS on DB
```

---

## 🎯 Recommended Migration Strategy

### **Phase 1 (Urgent) - Core System**
1. ✅ **`usePricing.ts`** → API (pricing affects all appointments)

### **Phase 2 (This Week) - High-Impact Admin Pages**
2. **`pages/admin/courses.vue`** (32 queries - worst offender)
3. **`pages/admin/index.vue`** (30 queries - dashboard)
4. **`pages/admin/categories.vue`** (24 queries - pricing related)
5. **`pages/admin/profile.vue`** (15 queries - settings)

### **Phase 3 (Next Week) - Reporting Pages**
6. **`pages/admin/product-sales.vue`** (10 queries)
7. **`pages/admin/products.vue`** (8 queries)
8. **`pages/admin/discounts.vue`** (7 queries)
9. **`pages/admin/exam-statistics.vue`** (7 queries)

### **Phase 4 (Following Week) - Remaining Pages**
10. All other admin pages

---

## ⚠️ Key Concerns

1. **N+1 Queries:** Especially in `courses.vue` where sessions/vehicles/rooms are loaded in loops
2. **No Pagination:** All pages load full datasets (could be 1000s of records)
3. **No Rate Limiting:** Rapid page reloads could overwhelm database
4. **No Audit Logging:** Admin actions not being logged
5. **Inefficient Admin Dashboard:** Loads 30+ queries on every admin login

---

## 💡 Quick Wins (Can implement immediately)

1. Add pagination to all list views
2. Add `.limit()` to prevent accidental full-table scans
3. Implement caching for frequently loaded data (categories, pricing_rules)
4. Batch user lookups instead of individual queries

---

## 📝 Implementation Notes

### For Each Admin Page API:
```typescript
// Required security layers:
✅ Authentication (admin role)
✅ Rate limiting (10-30 req/min per admin)
✅ Tenant isolation
✅ Input validation
✅ Audit logging (what data was accessed)
✅ Pagination (limit + offset)
✅ Select specific fields (not *)
```

### Example: courses.vue Migration Path
```typescript
// ❌ Current: 32 individual queries
// ✅ New: Consolidated API endpoints:
- GET /api/admin/courses (paginated list)
- POST /api/admin/courses (create)
- PUT /api/admin/courses/[id] (update)
- GET /api/admin/courses/[id]/sessions (sessions for course)
- POST /api/admin/courses/[id]/sessions (add session)
- GET /api/admin/courses/[id]/availability (vehicle/room availability)
```


