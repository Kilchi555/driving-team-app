# Direct Supabase Queries Audit

## Total Count: 1,207 Direct Queries

### By Location:
- Components: 439 queries
- Composables: 423 queries
- Pages: 345 queries

---

## CRITICAL: High-Risk Tables (Security Priority)

### 1. `users` table - 189 FILES ⚠️ MOST CRITICAL
**Status**: Currently causes RLS 406 errors
**Impact**: User data, authentication, profiles
**Files accessing it**: 189 (see below)
**Needs**: Comprehensive API wrapper

**Files using `users` table**:
- PriceDisplay.vue (billing data)
- EventModal.vue (payment methods, profile)
- CustomerDashboard.vue (staff names)
- CalendarComponent.vue (staff info)
- UserDetails.vue (admin profiles)
- EventModalForm.ts (student data)
- And 183 more...

### 2. `payments` table
**Impact**: Financial data, payment history
**Risk**: Sensitive financial information
**Files**: Multiple payment-related components

### 3. `appointments` table
**Impact**: User-specific business data
**Risk**: Schedule leaks, business logic exposure
**Files**: Calendar, pending tasks, staff assignments

### 4. `discount_sales` table
**Impact**: Pricing, discounts, financial data
**Risk**: Revenue information, discount manipulation
**Files**: EventModal, PriceDisplay

### 5. `company_billing_address`
**Impact**: Customer PII (names, addresses, phone)
**Risk**: Data leak, GDPR violation
**Files**: PriceDisplay, billing components

---

## MEDIUM RISK: Business Logic

### 6. `course_registrations`
- Impact: Course enrollment, student progress
- Files: ~20+

### 7. `product_sales`
- Impact: Sales records, inventory
- Files: ~15+

### 8. `invoices`
- Impact: Financial records
- Files: ~10+

### 9. `reservations` & `room_reservations`
- Impact: Resource bookings
- Files: ~5+

---

## LOWER RISK: Reference Data (Read-Only)

### 10. `categories` - Read-only lookup
### 11. `locations` - Read-only lookup
### 12. `event_types` - Read-only lookup
### 13. `services` - Read-only lookup

---

## Implementation Roadmap

### Phase 1: CRITICAL (Week 1)
**Goal**: Eliminate all 189 `users` table queries

**New APIs to create**:
1. `/api/user/get-profile` - Current user's profile
2. `/api/user/get-billing-address` - Billing info
3. `/api/user/get-payment-method` - Payment preferences
4. `/api/admin/get-user-profile` - Staff/Admin users (existing: `/api/admin/get-user-for-edit`)
5. `/api/calendar/get-staff-info` - Staff names for calendar
6. `/api/customer/get-staff-profiles` - Staff info for customers

**Expected Impact**:
- Eliminates all 406 errors
- Secure server-side authorization
- Audit logging for all data access

### Phase 2: HIGH RISK (Week 2-3)
**Goal**: Wrap payments, appointments, discounts

**New APIs**:
1. `/api/payments/get-user-payments` - Customer payment history
2. `/api/payments/get-payment-details` - Payment details (existing: partial)
3. `/api/appointments/get-user-appointments` - Customer appointments (existing: `/api/customer/get-appointments`)
4. `/api/discounts/get-applicable-discounts` - Discount lookup
5. `/api/appointments/get-pending` - Pending appointments (existing: `/api/admin/get-pending-appointments`)

### Phase 3: MEDIUM RISK (Week 3-4)
**Goal**: Business logic tables

**New APIs**:
1. `/api/courses/get-enrollments` - Course registrations
2. `/api/sales/get-product-sales` - Sales records
3. `/api/invoices/get-user-invoices` - Invoice history
4. `/api/reservations/list` - Resource reservations

### Phase 4: REFERENCE DATA (Optional)
Keep as direct queries OR wrap for audit logging:
- categories, locations, event_types (mostly read-only)
- Consider wrapping for complete audit trail

---

## Security Benefits

✅ **Server-Side Authorization**: Validate user access before returning data
✅ **Audit Logging**: Track all data access
✅ **Rate Limiting**: Prevent abuse
✅ **Input Validation**: Sanitize all inputs
✅ **RLS Bypass**: Use service_role safely within APIs
✅ **Consistent Logging**: Single point for security logging

---

## Estimated Effort

- Phase 1: 3-4 hours (6 critical APIs)
- Phase 2: 4-5 hours (5 high-risk APIs)
- Phase 3: 3-4 hours (4 medium-risk APIs)
- Phase 4: 1-2 hours (if wrap reference data)

**Total**: ~12-15 hours for full coverage

---

## Current Status

✅ Already wrapped:
- `/api/admin/get-user-for-edit`
- `/api/admin/get-discount-sales`
- `/api/customer/get-staff-names`
- `/api/customer/get-appointments`
- `/api/customer/get-pending-confirmations`
- `/api/customer/get-payments`
- `/api/calendar/get-appointments`
- `/api/admin/get-pending-appointments`
- `/api/admin/get-tenant-users`

❌ Still direct:
- 180+ other files querying users table
- All other sensitive tables

---

## Recommendation

**Start with Phase 1** (users table):
- This fixes all 406 errors
- This is the highest security risk
- This affects 189 files
- Estimated: 3-4 hours

Would you like to start with Phase 1?

