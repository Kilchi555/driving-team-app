-- AUDIT: Where we use getSupabaseAdmin() (Service Role Key)

-- Tables that use Service Role Key access:
-- Based on code grep, these are the endpoints/services that bypass RLS:

-- CRITICAL - Webhook Processing (no auth needed):
-- 1. wallee/webhook.post.ts - Process Wallee payments (creates/updates: payments, course_registrations, appointments, audit_logs)
-- 2. webhooks/wallee-payment-success.post.ts - Link payments to appointments

-- IMPORTANT - Payment Processing:
-- 3. payments/process.post.ts - Create Wallee transactions
-- 4. payments/process-public.post.ts - Public payment processing (no user required!)
-- 5. wallee/authorize-payment.post.ts - Authorize payments

-- API Endpoints - Staff/Admin operations:
-- 6. staff/get-staff-locations.post.ts - Get locations
-- 7. staff/get-staff-locations.get.ts - Get locations
-- 8. staff/add-student.post.ts - Add student to staff
-- 9. staff/working-hours-manage.post.ts - Manage working hours
-- 10. staff/get-appointment-statistics.get.ts - Get appointment stats

-- API Endpoints - Booking/Calendar:
-- 11. booking/get-available-slots.get.ts - Get available slots
-- 12. booking/get-customer-appointments.get.ts - Get customer appointments
-- 13. booking/reserve-slot.post.ts - Reserve booking slot
-- 14. booking/create-appointment.post.ts - Create appointment
-- 15. booking/release-reservation.post.ts - Release reservation

-- API Endpoints - Appointments:
-- 16. appointments/save.post.ts - Save appointment
-- 17. appointments/delete.post.ts - Delete appointment
-- 18. appointments/cancel-staff.post.ts - Staff cancel appointment

-- API Endpoints - Calendar Management:
-- 19. calendar/manage.post.ts - Calendar operations (we just fixed this!)
-- 20. external-calendars/sync-ics.post.ts - Sync external calendars (we just fixed this!)

-- API Endpoints - Students/Onboarding:
-- 21. students/resend-onboarding-sms.post.ts - Resend SMS
-- 22. students/[id]/payments.get.ts - Get student payments

-- API Endpoints - Courses/Enrollment:
-- 23. courses/enroll-wallee.post.ts - Enroll in course with Wallee

-- API Endpoints - Admin:
-- 24. admin/get-user-payment-details.get.ts - Get payment details
-- 25. admin/get-payments-overview.get.ts - Get payments overview
-- 26. admin/migrate-postal-codes.post.ts - Migrate postal codes

-- API Endpoints - Other:
-- 27. payments/status.post.ts - Check payment status
-- 28. invoices/create.post.ts - Create invoices
-- 29. invoices/download.post.ts - Download invoices
-- 30. cancellation-policies/manage.post.ts - Manage cancellation policies
-- 31. availability/queue-recalc.post.ts - Queue availability recalc
-- 32. examiners/list.get.ts - List examiners
-- 33. exams/save-result.post.ts - Save exam result
-- 34. staff/get-external-busy-times.get.ts - Get external busy times
-- 35. staff/get-evaluation-criteria.get.ts - Get evaluation criteria
-- 36. locations/create-pickup.post.ts - Create pickup location

-- Cron/Background Jobs:
-- 37. cron/sync-sari-courses.ts - Sync SARI courses
-- 38. cron/process-recalc-queue.get.ts - Process recalc queue

-- Utilities/Services:
-- 39. server/services/availability-calculator.ts - Calculate availability
-- 40. server/utils/auth-helper.ts - Auth helper functions
-- 41. server/utils/migrations/migrate-postal-codes.ts - Postal code migration
-- 42. debug/check-wallee-payments.get.ts - Debug endpoint

-- TOTAL: ~42 files using getSupabaseAdmin()

-- Key Security Considerations:
-- 1. ✅ Most endpoints have authentication checks BEFORE getSupabaseAdmin()
-- 2. ⚠️ webhook.post.ts and payments/process-public.post.ts have NO auth (by design)
-- 3. ⚠️ Need to verify all endpoints do proper tenant isolation after RLS is bypassed
-- 4. ✅ We recently added auth to: calendar/manage.post.ts, external-calendars/sync-ics.post.ts

-- RECOMMENDATION:
-- Audit these endpoints to ensure:
-- 1. Auth is checked (if needed)
-- 2. Tenant isolation is enforced
-- 3. No data leaks across tenants
-- 4. Input validation is strong
