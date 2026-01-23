-- Hard delete all appointments for user 30824de7-8fb1-49d8-9f2f-fa2eebb873db
-- WARNING: This will permanently delete all appointment records and related data for this user

-- Step 1: Get all appointment IDs for this user
-- SELECT id FROM appointments WHERE user_id = '30824de7-8fb1-49d8-9f2f-fa2eebb873db';

-- Step 2: Delete related data in order of dependencies

-- Delete cash_transactions for these appointments (FIRST - has FK to appointments)
DELETE FROM cash_transactions
WHERE appointment_id IN (
  SELECT id FROM appointments WHERE user_id = '30824de7-8fb1-49d8-9f2f-fa2eebb873db'
);

-- Delete notes for these appointments
DELETE FROM notes
WHERE appointment_id IN (
  SELECT id FROM appointments WHERE user_id = '30824de7-8fb1-49d8-9f2f-fa2eebb873db'
);

-- Delete product_sales for these appointments
DELETE FROM product_sales
WHERE appointment_id IN (
  SELECT id FROM appointments WHERE user_id = '30824de7-8fb1-49d8-9f2f-fa2eebb873db'
);

-- Delete discount_sales for these appointments
DELETE FROM discount_sales
WHERE appointment_id IN (
  SELECT id FROM appointments WHERE user_id = '30824de7-8fb1-49d8-9f2f-fa2eebb873db'
);

-- Delete payments for these appointments
DELETE FROM payments
WHERE appointment_id IN (
  SELECT id FROM appointments WHERE user_id = '30824de7-8fb1-49d8-9f2f-fa2eebb873db'
);

-- Step 3: Finally delete the appointments
DELETE FROM appointments
WHERE user_id = '30824de7-8fb1-49d8-9f2f-fa2eebb873db';

-- Verify deletion
SELECT COUNT(*) as remaining_appointments
FROM appointments
WHERE user_id = '30824de7-8fb1-49d8-9f2f-fa2eebb873db';

