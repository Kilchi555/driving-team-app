-- SERVICE ROLE KEY USAGE ANALYSIS
-- Determine where getSupabaseAdmin() is SAFE vs DANGEROUS

SAFE USAGE (getSupabaseAdmin is acceptable):
============================================

✅ 1. WEBHOOK HANDLERS (No authentication possible)
   - wallee/webhook.post.ts ✅ SAFE
     Why: External webhooks cannot provide auth tokens
     Security: Wallee signature validation exists
   
   - webhooks/wallee-payment-success.post.ts ✅ SAFE
     Why: Triggered by webhook, uses transaction IDs
     Security: Transaction IDs are hard to guess

✅ 2. INTERNAL OPERATIONS (Cron/background jobs)
   - cron/sync-sari-courses.ts ✅ SAFE
     Why: Server-only execution, no user input
     Security: Admin operation only
   
   - cron/process-recalc-queue.get.ts ✅ SAFE
     Why: Internal queue processing
     Security: No user input involved

✅ 3. PAYMENT OPERATIONS (Properly scoped)
   - payments/process.post.ts ✅ MOSTLY SAFE
     ✓ Has authentication check
     ✓ Validates paymentId ownership
     ✓ Only accesses own payment data
     ⚠️ Should double-check tenant isolation
   
   - wallee/authorize-payment.post.ts ✅ MOSTLY SAFE
     ✓ Has authentication check
     ✓ Validates paymentId
     ⚠️ Should verify tenant isolation

✅ 4. CORE BUSINESS LOGIC (Well-authenticated)
   - appointments/save.post.ts ✅ MOSTLY SAFE
     ✓ Checks authentication
     ✓ Validates user ownership
     ⚠️ Verify tenant isolation
   
   - appointments/delete.post.ts ✅ MOSTLY SAFE
     ✓ Checks authentication
     ✓ Validates ownership
   
   - staff/working-hours-manage.post.ts ✅ MOSTLY SAFE
     ✓ Staff only operation
     ✓ Has auth check
     ⚠️ Verify staff ownership

✅ 5. UTILITY/HELPER FUNCTIONS (Used by safe endpoints)
   - server/utils/auth-helper.ts ✅ SAFE (if called from safe endpoints)
   - server/services/availability-calculator.ts ✅ SAFE (if called from safe endpoints)


DANGEROUS USAGE (getSupabaseAdmin needs review):
================================================

⚠️ 1. PUBLIC/UNAUTHENTICATED ENDPOINTS
   - payments/process-public.post.ts ❌ DANGEROUS
     Issue: Public endpoint - anyone can call it!
     Risk: Potential data access without auth
     Fix: Verify it validates payment ownership properly
   
   - booking/get-available-slots.get.ts ⚠️ NEEDS REVIEW
     Issue: Called from booking (public page)
     Risk: Could expose staff info or pricing
     Fix: Verify tenant isolation only

   - booking/get-customer-appointments.get.ts ⚠️ NEEDS REVIEW
     Issue: Customer area - should check auth
     Risk: Cross-customer data leak if no validation
     Fix: Verify user_id filtering

⚠️ 2. ENDPOINTS THAT READ/WRITE MULTIPLE TABLES
   - calendar/manage.post.ts ⚠️ RECENTLY FIXED!
     Status: Just added auth (2025-02-12)
     ✓ Now requires authentication
     ✓ Verifies tenant access
   
   - external-calendars/sync-ics.post.ts ⚠️ RECENTLY FIXED!
     Status: Just added auth (2025-02-12)
     ✓ Now requires authentication
     ✓ Verifies calendar ownership

⚠️ 3. ADMIN ENDPOINTS (Can affect all data)
   - admin/get-user-payment-details.get.ts ⚠️ NEEDS REVIEW
     Issue: Admin endpoint
     Risk: Could access all user data if not limited
     Fix: Verify admin role check
   
   - admin/get-payments-overview.get.ts ⚠️ NEEDS REVIEW
     Issue: Admin endpoint
     Risk: Could access all payments without filtering
     Fix: Verify tenant isolation
   
   - admin/migrate-postal-codes.post.ts ⚠️ NEEDS REVIEW
     Issue: Data migration endpoint
     Risk: Could affect all data
     Fix: Verify it's admin-only and has rollback

⚠️ 4. ENROLLMENT/REGISTRATION ENDPOINTS
   - courses/enroll-wallee.post.ts ⚠️ NEEDS REVIEW
     Issue: Modifies course registrations
     Risk: Could enroll in courses not owned by user
     Fix: Verify user_id and course ownership
   
   - staff/add-student.post.ts ⚠️ NEEDS REVIEW
     Issue: Adds student to staff
     Risk: Could manipulate staff-student relationships
     Fix: Verify staff ownership and authorization

⚠️ 5. HIGH-PRIVILEGE OPERATIONS
   - staff/get-staff-locations.post.ts ⚠️ NEEDS REVIEW
     Issue: Staff data operation
     Risk: Could leak other staff's locations
     Fix: Verify staff_id ownership
   
   - staff/update-location-booking.post.ts ⚠️ NEEDS REVIEW
     Issue: Modifies location booking
     Risk: Could change other staff's bookings
     Fix: Verify staff_id ownership
   
   - invoices/create.post.ts ⚠️ NEEDS REVIEW
     Issue: Creates financial documents
     Risk: Could create invoices for wrong tenant/user
     Fix: Verify user/tenant ownership

⚠️ 6. DATA MODIFICATION ENDPOINTS
   - locations/create-pickup.post.ts ⚠️ NEEDS REVIEW
     Issue: Creates location data
     Risk: Could create locations for other tenants
     Fix: Verify tenant_id matches user's tenant
   
   - cancellation-policies/manage.post.ts ⚠️ NEEDS REVIEW
     Issue: Manages cancellation policies
     Risk: Could modify other tenant's policies
     Fix: Verify tenant_id ownership
   
   - exams/save-result.post.ts ⚠️ NEEDS REVIEW
     Issue: Saves exam results
     Risk: Could modify results for other students
     Fix: Verify exam ownership and authorization

❌ 3. LIKELY DANGEROUS (High priority review)
   - students/resend-onboarding-sms.post.ts ⚠️ CRITICAL REVIEW
     Issue: Can send SMS to any student!
     Risk: VERY HIGH - could spam/DoS
     Fix: MUST verify student_id ownership
   
   - students/[id]/payments.get.ts ⚠️ CRITICAL REVIEW
     Issue: Gets payments for any student
     Risk: VERY HIGH - could expose other customers' payments
     Fix: MUST verify student_id ownership


VERDICT:
========

✅ DEFINITELY SAFE (No changes needed):
   - Webhook handlers
   - Cron/background jobs
   - Internal operations

⚠️ MOSTLY SAFE (But verify tenant isolation):
   - Authentication checked
   - Payment operations
   - Core business logic

❌ HIGH PRIORITY REVIEW (Check immediately):
   - students/resend-onboarding-sms.post.ts (SMS to any user!)
   - students/[id]/payments.get.ts (Payment data exposure!)
   - admin endpoints (Multi-tenant access)
   - Public payment endpoints (No auth!)

🔧 RECENTLY FIXED (Now secure):
   - calendar/manage.post.ts ✅
   - external-calendars/sync-ics.post.ts ✅


ACTION ITEMS:
=============

1. IMMEDIATE (Security risk):
   [ ] Audit students/resend-onboarding-sms.post.ts for user_id validation
   [ ] Audit students/[id]/payments.get.ts for user_id validation
   [ ] Review payments/process-public.post.ts auth checks
   [ ] Review admin endpoints for tenant isolation

2. HIGH PRIORITY (Tenant isolation):
   [ ] Review all /api/staff/* endpoints for staff_id ownership
   [ ] Review all /api/booking/* endpoints for user_id validation
   [ ] Review course enrollment for user_id validation
   [ ] Review invoice creation for user/tenant ownership

3. MEDIUM PRIORITY (Consistency):
   [ ] Add consistent auth checks to all endpoints
   [ ] Add tenant_id validation everywhere
   [ ] Add audit logging for sensitive operations
   [ ] Document expected auth checks for each endpoint
