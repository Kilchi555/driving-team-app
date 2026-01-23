-- Hard delete all course registration payments for user 30824de7-8fb1-49d8-9f2f-fa2eebb873db
-- WARNING: This will permanently delete all course registration payments for this user

-- Step 1: Find all course registrations for this user
-- SELECT id, payment_id FROM course_registrations WHERE user_id = '30824de7-8fb1-49d8-9f2f-fa2eebb873db';

-- Step 2: Get all payment IDs for course registrations
-- SELECT p.id FROM payments p
-- INNER JOIN course_registrations cr ON p.id = cr.payment_id
-- WHERE cr.user_id = '30824de7-8fb1-49d8-9f2f-fa2eebb873db';

-- Step 3: Delete course registrations for this user
DELETE FROM course_registrations
WHERE user_id = '30824de7-8fb1-49d8-9f2f-fa2eebb873db';

-- Step 4: Delete standalone payments (those without appointment_id and not part of any registration)
-- These are orphaned course registration payments
DELETE FROM payments
WHERE user_id = '30824de7-8fb1-49d8-9f2f-fa2eebb873db'
  AND appointment_id IS NULL;

-- Verify deletion
SELECT 
  (SELECT COUNT(*) FROM course_registrations WHERE user_id = '30824de7-8fb1-49d8-9f2f-fa2eebb873db') as remaining_registrations,
  (SELECT COUNT(*) FROM payments WHERE user_id = '30824de7-8fb1-49d8-9f2f-fa2eebb873db' AND appointment_id IS NULL) as remaining_standalone_payments,
  (SELECT COUNT(*) FROM payments WHERE user_id = '30824de7-8fb1-49d8-9f2f-fa2eebb873db') as total_remaining_payments;

