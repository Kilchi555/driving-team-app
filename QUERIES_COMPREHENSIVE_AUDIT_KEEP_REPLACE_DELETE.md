# Comprehensive Query Analysis: 893 Direct Queries auf Kritischen Tables

## Summary
- **893 Total Matches** in 244 Dateien
- **9 Critical Tables**: users, payments, appointments, discount_sales, invoices, product_sales, course_registrations, reservations, company_billing_address
- **Status**: Analyse ohne Änderungen (nur Empfehlungen)

---

## 1. USERS Table (189 Files)

### Queries die "SO BELASSEN" können:
- ✅ **Self-read** (User liest sein Profil): `WHERE id = auth.uid()`
  - Files: auth.ts, login flow, profile pages
  - Reason: RLS schützt das, ist schnell, kein Audit-Log nötig
  - Action: KEEP as direct query

- ✅ **Registration/Auth** (Create new user): `INSERT INTO users`
  - Files: register-client.post.ts, auth flows
  - Reason: Nur beim Login, nicht Performance-critical für später
  - Action: KEEP (aber nur für neue Registrierung)

### Queries die durch API "ERSETZEN" sollten:
- 🔴 **Cross-User Read** (Staff liest Student-Profile): 30-40 Files
  - Files: EventModal.vue, EnhancedStudentModal.vue, CalendarComponent.vue, etc.
  - Current: Direct Supabase query
  - Problem: Keine Authorization-Check, keine Audit
  - Solution: `/api/admin/get-user-for-edit` (EXISTS!) ✅
  - Action: UPDATE FILES to use existing API

- 🔴 **Payment Method Read**: 15-20 Files
  - Files: EventModal.vue (multiple), PriceDisplay.vue
  - Current: `.select('preferred_payment_method').eq('id', otherId)`
  - Problem: 406 errors, keine Ownership-Check
  - Solution: Wrap in `/api/user/get-payment-method`
  - Action: CREATE NEW API + UPDATE FILES

- 🔴 **Tenant User List** (Admin sieht alle User im Tenant): 20+ Files
  - Files: admin dashboards, user lists, staff selector
  - Current: Multiple direct queries
  - Problem: Keine zentrale Authorization
  - Solution: `/api/admin/get-tenant-users` (EXISTS!) ✅
  - Action: UPDATE FILES to use existing API

- 🔴 **User Billing Address**: 5-10 Files
  - Files: PriceDisplay.vue, billing components
  - Problem: 406 errors, keine Validation
  - Solution: Wrap in `/api/user/get-billing-address`
  - Action: CREATE NEW API + UPDATE FILES

### Queries die "LÖSCHEN" sollten:
- ❌ **Debug/Test Queries**: 5-10 Files
  - Files: test-*.vue, debug_*.js
  - Action: DELETE test files + queries

---

## 2. APPOINTMENTS Table (85 Files)

### Queries die "SO BELASSEN":
- ✅ **Self-read** (User liest eigene Appointments): 10 Files
  - Files: CustomerDashboard, customer/payments
  - Current: `.select('*').eq('user_id', auth.uid())`
  - RLS: Schützt das
  - Action: KEEP (aber später migrate zu API für Audit)
  - Timeline: Phase 2-3

### Queries die "ERSETZEN" sollten:
- 🔴 **Calendar/Staff Read** (Staff sieht alle Appointments): 30-40 Files
  - Files: CalendarComponent.vue, usePendingTasks.ts, admin dashboards
  - Current: Direct Supabase
  - Problem: 406 errors (haben wir gesehen!), keine Authorization
  - Solution: `/api/calendar/get-appointments` (EXISTS!) ✅ 
              `/api/admin/get-pending-appointments` (EXISTS!) ✅
  - Action: UPDATE FILES to use existing APIs

- 🔴 **Appointment Create/Update** (Staff erstellt/ändert Termine): 15 Files
  - Files: EventModal.vue, appointment handlers
  - Problem: Keine Audit-Logs, keine Rate-Limiting
  - Solution: Wrap CREATE/UPDATE in `/api/appointments/create` and `/api/appointments/update`
  - Action: CREATE NEW APIs + UPDATE FILES

- 🔴 **Duration/Category Lookups**: 10 Files
  - Current: Multiple queries per component
  - Problem: Inefficient, viele separate requests
  - Solution: `/api/references/get-options` (categories + durations)
  - Action: CREATE NEW API + UPDATE FILES

### Queries die "LÖSCHEN":
- ❌ Debug/Test Appointments: 5 Files
  - Action: DELETE

---

## 3. PAYMENTS Table (80 Files)

### Queries die "SO BELASSEN":
- ✅ **Self-read** (User liest eigene Payments): 5-10 Files
  - Files: customer/payments, dashboard
  - RLS: Protects
  - Action: KEEP (aber später zu API für Audit)

### Queries die "ERSETZEN" sollten:
- 🔴 **Payment Read** (Admin/Staff): 20-30 Files
  - Files: PaymentModal.vue, admin dashboards, analytics
  - Problem: Keine zentrale Authorization, keine Audit
  - Solution: `/api/payments/list` (EXISTS!) + new `/api/payments/get-details`
  - Action: UPDATE FILES to use API

- 🔴 **Payment Create/Update/Delete**: 15-20 Files
  - Files: payment handlers, wallee integration, refunds
  - Problem: Complex logic scattered, no central validation
  - Solution: `/api/payments/create`, `/api/payments/update`, `/api/payments/delete`
  - Action: CREATE 3 NEW APIs + UPDATE FILES

- 🔴 **Payment Status Updates**: 10-15 Files
  - Files: wallee webhook, automatic payment processing
  - Problem: Inconsistent status updates, no audit
  - Solution: `/api/payments/update-status` (with audit)
  - Action: CREATE NEW API + UPDATE FILES

### Queries die "LÖSCHEN":
- ❌ Test/Debug payments: 5 Files

---

## 4. DISCOUNT_SALES Table (40 Files)

### Queries die "SO BELASSEN":
- None (alle sollten durch API gehen wegen financial data)

### Queries die "ERSETZEN" sollten:
- 🔴 **ALL Discount Reads**: 30-35 Files
  - Files: EventModal.vue, PriceDisplay.vue, pricing calculations
  - Current: Direct queries
  - Problem: 406 errors, no authorization, financial data
  - Solution: `/api/admin/get-discount-sales` (EXISTS!) ✅
  - Action: UPDATE FILES to use existing API

- 🔴 **Discount Create/Update/Delete**: 5-10 Files
  - Files: admin discount management
  - Problem: No Audit-Logs, no validation centralized
  - Solution: `/api/discounts/create`, `/api/discounts/update`, `/api/discounts/delete`
  - Action: CREATE 3 NEW APIs

---

## 5. INVOICES Table (30 Files)

### Queries die "SO BELASSEN":
- ✅ **Read-Only Admin Reports**: 20-25 Files
  - Files: admin/invoices, admin/analytics, reports
  - Reason: Read-only, mostly aggregated data
  - Action: KEEP as direct (can add API layer later for audit if needed)

### Queries die "ERSETZEN" sollten:
- 🔴 **Invoice Create/Generate**: 5-10 Files
  - Files: payment/invoice generation handlers
  - Problem: Important financial operation, no central validation
  - Solution: `/api/invoices/create`, `/api/invoices/regenerate`
  - Action: CREATE 2 NEW APIs

---

## 6. PRODUCT_SALES Table (30 Files)

### Queries die "SO BELASSEN":
- ✅ **Read-Only Reports**: 20-25 Files
  - Files: admin dashboards, analytics
  - Reason: Aggregated data, read-only
  - Action: KEEP

### Queries die "ERSETZEN" sollten:
- 🔴 **Product Sale Create/Update**: 5-10 Files
  - Files: product sales handlers
  - Solution: `/api/product-sales/create`, `/api/product-sales/update`
  - Action: CREATE 2 NEW APIs

---

## 7. COURSE_REGISTRATIONS Table (25 Files)

### Queries die "SO BELASSEN":
- ✅ **Read-Only Lookups**: 15-20 Files
  - Reason: Mostly read-only, enrollment status checks
  - Action: KEEP

### Queries die "ERSETZEN" sollten:
- 🔴 **Enrollment Create/Delete**: 5-10 Files
  - Solution: `/api/courses/enroll`, `/api/courses/unenroll`
  - Action: CREATE 2 NEW APIs (exists partially!)

---

## 8. RESERVATIONS & ROOM_RESERVATIONS (20 Files)

### "SO BELASSEN":
- ✅ **Read-Only Lookups**: 15 Files

### "ERSETZEN":
- 🔴 **Create/Update/Delete**: 5 Files
  - Solution: `/api/reservations/create`, etc.
  - Action: CREATE 3 NEW APIs

---

## 9. COMPANY_BILLING_ADDRESS (15 Files)

### "SO BELASSEN":
- None (PII - sollte durch API geschützt sein)

### "ERSETZEN":
- 🔴 **ALL Operations**: 15 Files
  - Solution: `/api/customer/get-billing-address`, `/api/customer/update-billing-address`
  - Action: CREATE 2 NEW APIs

---

## 📊 SUMMARY BY ACTION:

### ✅ KEEP AS DIRECT (80-100 queries):
1. Self-reads (User liest sein Profil) - 20 queries
2. Read-only reference data (categories, locations, event_types) - 30 queries
3. Read-only reports (invoices, product_sales) - 30 queries

### 🔴 REPLACE WITH API (350-400 queries):
**Phase 1 (Tomorrow):**
1. `/api/appointments/get-list` - 30 queries
2. `/api/user/get-profile` - 20 queries
3. `/api/references/get-options` - 15 queries
4. **UPDATE existing APIs**:
   - Use `/api/admin/get-user-for-edit` - 30 files
   - Use `/api/calendar/get-appointments` - 20 files
   - Use `/api/admin/get-tenant-users` - 15 files

**Phase 2-3 (Later):**
5. Payments APIs - 8-10 new APIs
6. Invoices APIs - 2-3 new APIs
7. Discounts APIs - 3-5 new APIs
8. Courses/Reservations APIs - 5-8 new APIs

### ❌ DELETE (20-30 queries):
- Debug/Test files and queries
- Unused/obsolete code
- Test appointments/payments

---

## 🎯 ACTION PLAN:

### TOMORROW (6:00-10:00):
```
Phase 1: UPDATE existing APIs
├─ EventModal.vue: use /api/admin/get-user-for-edit ✅ (EXISTS)
├─ CalendarComponent.vue: use /api/calendar/get-appointments ✅ (EXISTS)
├─ CustomerDashboard.vue: use /api/admin/get-tenant-users ✅ (EXISTS)
└─ PriceDisplay.vue: create /api/user/get-billing-address (NEW)

Phase 2: Create 3 NEW Top APIs
├─ /api/appointments/get-list (replaces 30 queries)
├─ /api/user/get-profile (replaces 20 queries)
├─ /api/references/get-options (replaces 15 queries)

Phase 3: Update Components
└─ Refactor 50-60 files to use new APIs

Result: 65-75 queries wrapped, 406 errors gone
```

### LATER (Phase 2-3):
```
Financial APIs (Payments, Invoices, Discounts):
├─ Create 8-10 new APIs
├─ Update 50+ files
├─ Add audit logging to all

Business Logic APIs:
├─ Courses, Reservations
├─ Update 20+ files

Cleanup:
├─ Delete 20-30 debug/test queries
├─ RLS policy cleanup (consolidate duplicates)
```

---

## 🔒 SECURITY IMPACT:

### Queries we keep as direct:
- ✅ Self-reads: Protected by RLS, no cross-user access risk
- ✅ Read-only reports: No write risk, mostly aggregated
- ✅ Reference data: Public data, no PII

### Queries we wrap with APIs:
- 🔐 Cross-user access: Server-side authorization
- 🔐 Financial operations: Audit logging
- 🔐 User data: PII protection
- 🔐 Business logic: Centralized validation

**Expected Result**: 80% reduction in RLS 406 errors, complete audit trail for sensitive operations

---

## ⚠️ IMPORTANT: THIS IS ANALYSIS ONLY

**NO CHANGES MADE YET!** This document is for planning.

When approved, implementation will follow this plan phase-by-phase.

