-- SPECIFIC SECURITY AUDIT CHECKLIST

HIGH PRIORITY - Check these IMMEDIATELY:
==========================================

1. students/resend-onboarding-sms.post.ts
   [ ] Does it check that user can only resend SMS to their own student?
   [ ] Does it validate student_id belongs to current user?
   [ ] Does it limit SMS sending to prevent spam?
   
2. students/[id]/payments.get.ts
   [ ] Does it verify user can only access their own payments?
   [ ] Does it check student ownership?
   [ ] Does it filter by tenant_id?

3. payments/process-public.post.ts
   [ ] Why is this public? Does it need to be?
   [ ] What auth is done inside?
   [ ] Can anyone create any payment?

4. admin/get-user-payment-details.get.ts
   [ ] Does it check user is admin?
   [ ] Does it filter by tenant_id?
   [ ] Can admin see payments from OTHER tenants?

5. admin/get-payments-overview.get.ts
   [ ] Does it check user is admin?
   [ ] Does it filter by tenant_id?
   [ ] Can admin see payments from OTHER tenants?


MEDIUM PRIORITY - Verify tenant isolation:
============================================

6. staff/get-staff-locations.post.ts
   [ ] Does it verify staff_id belongs to current user?
   [ ] Does it filter by tenant_id?
   [ ] Does it check staff role?

7. staff/update-location-booking.post.ts
   [ ] Does it verify staff_id belongs to current user?
   [ ] Does it check location ownership?
   [ ] Does it filter by tenant_id?

8. courses/enroll-wallee.post.ts
   [ ] Does it verify user can enroll in course?
   [ ] Does it check course belongs to user's tenant?
   [ ] Does it validate payment belongs to user?

9. invoices/create.post.ts
   [ ] Does it verify user/tenant ownership?
   [ ] Does it validate what's in the invoice?
   [ ] Can it create invoices for other tenants?

10. appointments/save.post.ts
    [ ] Does it verify user ownership?
    [ ] Does it check staff ownership?
    [ ] Does it validate all appointment data?

11. booking/get-customer-appointments.get.ts
    [ ] Does it verify customer ownership?
    [ ] Does it filter by user_id?
    [ ] Does it filter by tenant_id?

12. booking/reserve-slot.post.ts
    [ ] Does it verify user can book?
    [ ] Does it check availability correctly?
    [ ] Does it prevent double-booking?

13. booking/create-appointment.post.ts
    [ ] Does it verify user ownership?
    [ ] Does it check slot availability?
    [ ] Does it validate payment status?

14. staff/add-student.post.ts
    [ ] Does it verify staff ownership?
    [ ] Does it check student is from same tenant?
    [ ] Does it validate authorization?

15. locations/create-pickup.post.ts
    [ ] Does it verify user/tenant ownership?
    [ ] Does it validate all location data?
    [ ] Can it create in other tenants?


SQL QUERIES TO HELP AUDIT:
==========================

-- Check which tables DO NOT have tenant_id column
SELECT tablename, column_name
FROM pg_tables t
LEFT JOIN information_schema.columns c ON t.tablename = c.table_name
WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE 'pg_%'
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = t.tablename 
    AND column_name = 'tenant_id'
  )
ORDER BY tablename;

-- Check for tables with auth_user_id but NOT user_id
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = pg_tables.tablename 
    AND column_name = 'auth_user_id'
  )
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = pg_tables.tablename 
    AND column_name = 'user_id'
  );
