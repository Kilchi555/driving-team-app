# 👥 👔 CUSTOMER & STAFF AREA ANALYSIS

**Total Non-Admin Queries:** 201 queries
- Customer Area: 115 queries (57%)
- Staff Area: 86 queries (43%)

---

## 👥 CUSTOMER AREA (115 queries in 22 files)

### CRITICAL CUSTOMER FILES

| File | Queries | Type | Risk |
|------|---------|------|------|
| `components/admin/UserPaymentDetails.vue` | 34 | Payment | 🔴🔴🔴 |
| `components/PaymentComponent.vue` | 14 | Payment | 🔴🔴 |
| `composables/useGeneralResourceBookings.ts` | 10 | Booking | 🔴🔴 |
| `composables/useAutoPayment.ts` | 6 | Payment | 🔴🔴 |
| `composables/usePaymentStatus.ts` | 5 | Payment | 🔴 |
| `pages/shop.vue` | 5 | Shop | 🔴 |
| `components/CustomerInviteSelector.vue` | 4 | Invite | 🔴 |
| `components/users/CustomersTab.vue` | 4 | Admin View | 🔴 |
| `composables/usePaymentMethods.ts` | 4 | Payment | 🔴 |
| `pages/anonymous-sale/[id].vue` | 4 | Sale | 🔴 |

### OTHER CUSTOMER FILES (12 more files with 1-4 queries each)
- `pages/booking/availability/[slug].vue` - 4 queries
- `pages/customers.vue` - 4 queries
- `pages/payment/success.vue` - 3 queries
- `components/customer/CourseEnrollmentModal.vue` - 2 queries
- `components/customer/EvaluationsOverviewModal.vue` - 2 queries
- `components/customer/ProfileModal.vue` - 2 queries
- `pages/admin/payment-reminders.vue` - 2 queries
- `pages/customer/courses/[slug].vue` - 2 queries
- `components/CashPaymentConfirmation.vue` - 1 query
- `components/PaymentModal.vue` - 1 query
- `components/customer/CustomerDashboard.vue` - 1 query
- `components/customer/UpcomingLessonsModal.vue` - 1 query

### CUSTOMER AREA SUMMARY
- **Total Queries:** 115
- **Total Files:** 22
- **Highest Risk:** Payment-related operations (58 queries)
- **Medium Risk:** Booking/Resource operations (14 queries)
- **Lower Risk:** Informational queries (43 queries)

**PAYMENT QUERIES ARE CRITICAL** - These handle financial transactions!

---

## 👔 STAFF AREA (86 queries in 12 files)

### CRITICAL STAFF FILES

| File | Queries | Type | Risk |
|------|---------|------|------|
| `components/admin/EvaluationSystemManagerInline.vue` | 39 | Evaluation | 🔴🔴🔴 |
| `components/users/StaffTab.vue` | 18 | Staff Admin | 🔴🔴 |
| `components/ExternalCalendarSettings.vue` | 5 | Calendar | 🔴 |
| `components/EvaluationModalNew.vue` | 4 | Evaluation | 🔴 |
| `composables/useAdminAppointments.ts` | 4 | Appointments | 🔴 |
| `components/StaffExamStatistics.vue` | 3 | Statistics | 🔴 |
| `composables/useEvaluationData.ts` | 3 | Evaluation | 🔴 |
| `pages/register-staff.vue` | 3 | Registration | 🔴 |

### OTHER STAFF FILES (4 more files with 1-2 queries each)
- `components/StaffCashBalance.vue` - 2 queries
- `components/StaffDurationSettings.vue` - 2 queries
- `composables/useExternalCalendarSync.ts` - 2 queries
- `components/PostAppointmentModal.vue` - 1 query

### STAFF AREA SUMMARY
- **Total Queries:** 86
- **Total Files:** 12
- **Highest Risk:** Evaluation system (46 queries)
- **Medium Risk:** Calendar/Appointment operations (11 queries)
- **Lower Risk:** Statistics/Registration (29 queries)

**EVALUATION QUERIES ARE CRITICAL** - These handle student assessment!

---

## 🔥 PRIORITY FOR CUSTOMER & STAFF

### Immediate Priority (DO FIRST)

#### Customer Critical (48 queries in 3 files)
1. `components/admin/UserPaymentDetails.vue` - **34 queries** 🚨
   - Payment management for customers
   - Direct DB mutations likely
   - CRITICAL financial data

2. `components/PaymentComponent.vue` - **14 queries** 🚨
   - Payment processing
   - Transaction handling
   - CRITICAL financial data

#### Staff Critical (39 queries in 1 file)
3. `components/admin/EvaluationSystemManagerInline.vue` - **39 queries** 🚨
   - Student evaluation system
   - Assessment data
   - Direct mutations
   - CRITICAL educational data

#### Next Priority (37 queries in 4 files)
4. `composables/useGeneralResourceBookings.ts` - **10 queries** 🔴
   - Resource booking system
   - Reservation management

5. `components/users/StaffTab.vue` - **18 queries** 🔴
   - Staff management
   - Admin view of staff

6. `composables/useAutoPayment.ts` - **6 queries** 🔴
   - Automatic payment processing
   - Financial data

7. `composables/usePaymentStatus.ts` - **5 queries** 🔴
   - Payment status tracking

---

## ⚠️ SECURITY CONCERNS

### For Customer Area
- 🔴 **PAYMENT OPERATIONS** - Direct DB mutations from browser
- 🔴 **TRANSACTION HANDLING** - Financial data integrity at risk
- 🔴 **PII EXPOSURE** - Customer personal/payment info
- 🔴 **COMPLIANCE RISK** - Payment regulations (PCI-DSS, etc.)

### For Staff Area
- 🔴 **EVALUATION DATA** - Student assessment integrity
- 🔴 **APPOINTMENT MUTATIONS** - Schedule manipulation risk
- 🔴 **CALENDAR ACCESS** - Schedule access control missing
- 🔴 **REGISTRATION** - Staff creation/modification from client

---

## 📊 QUERY TYPES (ESTIMATED)

### Customer Area (115 queries)
- **Payments mutations** (35%): 40 queries - INSERT, UPDATE, DELETE financial records
- **Booking/Resource reads** (35%): 40 queries - SELECT availability, resources
- **Status checks** (30%): 35 queries - SELECT payment/booking status

### Staff Area (86 queries)
- **Evaluation mutations** (45%): 39 queries - Create/update evaluations
- **Appointment mutations** (15%): 13 queries - Schedule management
- **Calendar reads** (25%): 21 queries - Calendar display
- **Registration** (15%): 13 queries - Staff onboarding

---

## 🎯 RECOMMENDED MIGRATION ORDER

### Phase 1: Payment System (CRITICAL - Do First)
**Customer Area - 48 queries in 2 files**
1. Migrate `components/PaymentComponent.vue` (14 queries)
2. Migrate `components/admin/UserPaymentDetails.vue` (34 queries)
3. Create API: `POST /api/payment/process-payment`
4. Create API: `POST /api/payment/update-payment-status`
5. Create API: `POST /api/payment/get-payment-details`

**Why First?** Financial data is most sensitive!

### Phase 2: Evaluation System (CRITICAL - Do Second)
**Staff Area - 39 queries in 1 file**
1. Migrate `components/admin/EvaluationSystemManagerInline.vue` (39 queries)
2. Create comprehensive evaluation API endpoint
3. Consolidate evaluation operations

**Why Second?** Student assessment integrity is critical!

### Phase 3: Booking & Appointments (High Priority)
**Customer + Staff - 30 queries in 4 files**
1. `composables/useGeneralResourceBookings.ts` (10)
2. `components/users/StaffTab.vue` (18)
3. Create booking/appointment endpoints

### Phase 4: Remaining Operations
**76 queries in 17 files**
- Mostly read-only
- Can be batched
- Lower risk

---

## ✅ NEXT ACTIONS

1. **REVIEW PAYMENT OPERATIONS** immediately (48 critical queries)
2. **AUDIT evaluation system** (39 critical queries)
3. **CREATE API endpoints** for Phase 1 & 2 (87 queries total)
4. **MIGRATE customer payment** (test thoroughly!)
5. **MIGRATE staff evaluation** (ensure data integrity)
6. **THEN do remaining** 82 queries in lower-priority files

---

Generated: 2026-01-28
