# Complete Direct Database Queries Inventory

## 🚨 CRITICAL FINDING

**Total Direct `.from()` Queries in Frontend:** ~600+ instances  
**Affected Files:** 100+ components & composables  
**Security Risk:** 🔴 **EXTREME** - No auth, no rate limiting, no audit logging

---

## 📊 Summary by Category

### COMPOSABLES (71 files with direct queries)
**Total Queries:** ~300+ 

| File | Queries | Risk | Used By |
|------|---------|------|---------|
| **useEventModalForm.ts** | 21 | 🔴 HIGH | EventModal (core appointment creation) |
| **useInvoices.ts** | 24 | 🟡 MEDIUM | Invoice management |
| **useStudentCredits.ts** | 15 | 🟡 MEDIUM | Student credit system |
| **useReminderService.ts** | 16 | 🟡 MEDIUM | Email/SMS reminders |
| **useCancellationPolicies.ts** | 16 | 🟡 MEDIUM | Cancellation logic |
| **useHybridDiscounts.ts** | 14 | 🟡 MEDIUM | Discount calculations |
| **useDiscounts.ts** | 14 | 🟡 MEDIUM | Discount system |
| **useCourseParticipants.ts** | 14 | 🟡 MEDIUM | Course registration |
| **usePricing.ts** | 11 | 🔴 HIGH | Price calculations (EventModal) |
| **usePaymentsNew.ts** | 11 | 🔴 HIGH | Payment processing |
| **useAutoSave.ts** | 10 | 🟡 MEDIUM | Auto-save feature |
| **useAvailabilitySystem.ts** | 11 | 🟡 MEDIUM | Staff availability |
| **... 61 more files** | 100+ | 🟡 | Various |

---

### COMPONENTS (31 files with direct queries)
**Total Queries:** ~200+

| File | Queries | Risk | Used In |
|------|---------|------|---------|
| **EventModal.vue** | 37 | 🔴 CRITICAL | Appointment creation (core feature) |
| **EnhancedStudentModal.vue** | 24 | 🔴 HIGH | Student management |
| **EvaluationModal.vue** | 12 | 🟡 MEDIUM | Exam evaluations |
| **CalendarComponent.vue** | 16 | 🔴 HIGH | Main calendar view |
| **PaymentComponent.vue** | 19 | 🔴 HIGH | Payment handling |
| **StaffSettings.vue** | 18 | 🟡 MEDIUM | Staff configuration |
| **ExamLocationSearchDropdown.vue** | 13 | 🟡 MEDIUM | Exam location search |
| **CustomerInviteSelector.vue** | 11 | 🟡 MEDIUM | Customer selection |
| **LocationSelector.vue** | 10 | 🟡 MEDIUM | Location selection |
| **PriceDisplay.vue** | 8 | 🟡 MEDIUM | Price display |
| **... 21 more files** | 60+ | 🟡 | Various |

---

### ADMIN PAGES (19 files with direct queries)
**Total Queries:** ~160+

| Page | Queries | Risk |
|------|---------|------|
| **courses.vue** | 32 | 🔴 CRITICAL |
| **index.vue** | 30 | 🔴 CRITICAL |
| **categories.vue** | 24 | 🔴 CRITICAL |
| **profile.vue** | 15 | 🔴 HIGH |
| **product-sales.vue** | 10 | 🟡 HIGH |
| **products.vue** | 8 | 🟡 HIGH |
| **discounts.vue** | 7 | 🟡 HIGH |
| **exam-statistics.vue** | 7 | 🟡 MEDIUM |
| **examiners.vue** | 7 | 🟡 MEDIUM |
| **staff-hours.vue** | 6 | 🟡 MEDIUM |
| **... 9 more pages** | 40+ | 🟡 |

---

## 🔴 ABSOLUTE TOP PRIORITY (Block User Action)

These are used in core user flows and MUST be secured FIRST:

### 1. **EventModal.vue** (37 queries)
**Impact:** Every time user creates/edits appointment
**Why Critical:** 
- Called constantly by staff during workday
- Multiple queries per form submission
- No rate limiting = DoS vulnerability
- Direct RLS bypass possible

**Should be:** Consolidated into 3-4 secure API endpoints

---

### 2. **useEventModalForm.ts** (21 queries)
**Impact:** Form validation in EventModal
**Queries:** Appointments, products, discounts, credit checks, pricing

**Should be:** All consolidated into backend APIs

---

### 3. **useEventModalHandlers.ts** (5 queries)
**Impact:** Handlers for EventModal interactions

---

### 4. **PaymentComponent.vue** (19 queries)
**Impact:** Every payment confirmation
**Queries:** Direct payment status checks, user data, etc.

**Should be:** Single secure payment endpoint

---

### 5. **usePricing.ts** (11 queries)
**Impact:** Price calculations (affects all money)
**Already Identified:** Phase 1 migration target

---

### 6. **CalendarComponent.vue** (16 queries)
**Impact:** Calendar load on every page view
**Queries:** Multiple event type, category, pricing queries

---

## 🟠 HIGH PRIORITY (This Week)

These are frequently used but less critical than above:

- **useInvoices.ts** (24 queries) - Invoice generation
- **useStudentCredits.ts** (15 queries) - Credit system
- **usePaymentsNew.ts** (11 queries) - Alternative payment system
- **useReminderService.ts** (16 queries) - Email/SMS sending
- **EnhancedStudentModal.vue** (24 queries) - Student management

---

## 🟡 MEDIUM PRIORITY (Next Week+)

Lower frequency, but still security risks:

- Admin pages (courses, categories, discounts, etc.)
- Course management composables
- User management composables
- Settings pages

---

## ⚠️ Key Security Issues

### 1. **No Authentication Layer**
```typescript
// Currently any logged-in user can:
const { data } = await supabase.from('payments').select('*')
// Query ANY payment record (RLS should protect but fragile)
```

### 2. **No Rate Limiting**
```typescript
// No protection against:
// - Rapid sequential queries (hammering database)
// - User accidentally loading page 100 times
// - Potential DoS attack
```

### 3. **No Audit Logging**
```typescript
// No record of:
// - Who accessed what data
// - When sensitive data was queried
// - Failed access attempts
```

### 4. **No Input Validation**
```typescript
// Could pass malicious inputs directly
const results = await supabase
  .from('users')
  .select('*')
  .eq('id', userProvidedId)  // ❌ No validation
```

### 5. **Potential N+1 Problems**
```typescript
// Especially in loops:
for (const appointment of appointments) {
  const payment = await supabase.from('payments').select('*').eq('id', appointment.payment_id)
  // Could be 1000 queries for 1000 appointments!
}
```

### 6. **No Pagination**
```typescript
// Loads entire tables:
const { data } = await supabase
  .from('payments')
  .select('*')  // ❌ Could be 10,000+ records
  .limit(1000)  // Only some files have this
```

---

## 🎯 Recommended Migration Path

### **PHASE 1 (URGENT - This Week)**
Priority: **Core User Actions**

1. **usePricing.ts** → `/api/pricing/calculate.post.ts`
2. **EventModal.vue queries** → `/api/appointments/validate-form.post.ts`
3. **PaymentComponent.vue** → Consolidate payment APIs

**Expected Impact:** Secures 60+ queries affecting all appointment creation

---

### **PHASE 2 (Next Week)**
Priority: **Frequent Admin Operations**

4. **useEventModalForm.ts** → Backend validation
5. **CalendarComponent.vue** → `/api/calendar/get-appointments.post.ts` (already started)
6. **useStudentCredits.ts** → `/api/customers/get-credits.post.ts`

**Expected Impact:** Secures another 50+ queries

---

### **PHASE 3 (Following Week)**
Priority: **Admin Pages**

7. **pages/admin/courses.vue** → Multiple course APIs
8. **pages/admin/index.vue** → Dashboard aggregation API
9. **pages/admin/categories.vue** → Category management APIs

---

### **PHASE 4 (Next Month)**
Priority: **Remaining Composables**

10. All other composables with direct queries

---

## 📋 Implementation Strategy

### For Each Migration:

1. **Create secure API endpoint** with:
   - ✅ Authentication check
   - ✅ Rate limiting
   - ✅ Input validation
   - ✅ Tenant isolation
   - ✅ Audit logging
   - ✅ Pagination support

2. **Test parallel** (new API + old direct query) to ensure compatibility

3. **Switch frontend** to use new API

4. **Remove direct query** from frontend

5. **Monitor for issues**

---

## 💾 Suggested API Endpoints Needed

### Critical Payment/Appointment APIs:
```
GET    /api/appointments/validate-form
POST   /api/appointments/get-data-for-form
POST   /api/payments/get-payment-info
POST   /api/payments/validate-payment
GET    /api/pricing/calculate
POST   /api/credits/get-student-balance
```

### Admin APIs:
```
GET    /api/admin/courses (paginated)
POST   /api/admin/courses
PUT    /api/admin/courses/[id]
GET    /api/admin/courses/[id]/sessions
POST   /api/admin/categories (pricing setup)
GET    /api/admin/invoices (paginated)
GET    /api/admin/product-sales (paginated)
```

### Support APIs:
```
GET    /api/admin/students (paginated, filterable)
GET    /api/admin/staff (paginated)
GET    /api/admin/discounts (paginated)
GET    /api/admin/evaluations (paginated)
```

---

## 📈 Impact Analysis

### **Current State (Unsecured)**
- ❌ 600+ direct DB queries
- ❌ No rate limiting
- ❌ No audit logging
- ❌ Vulnerable to N+1 attacks
- ❌ Vulnerable to pagination DoS

### **After Phase 1 (Urgent fixes)**
- ✅ Core 60+ queries secured
- ✅ Appointment creation protected
- ✅ Payment system hardened
- 🟡 150+ queries still exposed

### **After Phase 2 (High-priority)**
- ✅ 110+ queries secured
- ✅ Calendar protected
- ✅ Student data secured
- 🟡 100+ queries still exposed

### **After Phase 4 (Complete)**
- ✅ All 600+ queries secured
- ✅ Full audit logging
- ✅ Rate limiting on all operations
- ✅ Enterprise-grade security

---

## 🎓 Lessons Learned

This codebase was built **rapidly** for an MVP and now has **significant technical debt** in the security layer. The pattern is:

1. Use direct Supabase client in components
2. Rely on RLS policies for security (insufficient)
3. No rate limiting (performance risk)
4. No audit logging (compliance risk)
5. Complex queries scattered across 100+ files

**Solution:** Centralize all data access through secure APIs (API Gateway pattern).

---

**Next Step:** Agree on PHASE 1 scope and begin implementation of critical endpoints.


